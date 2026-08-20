import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { DEFAULT_MAX_AGE_DAYS, getContentFreshness } from "../../shared/content-freshness";
import { isContentStatus, jsonResponse, validateContentWrite, validateForPublish, validateForReview, validatePublicationApproval, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export function hasAdminGroup(claims: Record<string, unknown> | undefined, groupName = process.env.ADMIN_GROUP_NAME ?? "admin"): boolean {
  const claim = claims?.["cognito:groups"];
  const normalizeGroup = (value: string): string => value.trim().replace(/^\[|\]$/g, "").replace(/^['\"]|['\"]$/g, "");
  const includesGroup = (values: unknown[]): boolean => values.some((value) => typeof value === "string" && normalizeGroup(value) === groupName);
  if (Array.isArray(claim)) return includesGroup(claim);
  if (typeof claim !== "string") return false;
  try {
    const parsed = JSON.parse(claim) as unknown;
    if (Array.isArray(parsed)) return includesGroup(parsed);
    if (typeof parsed === "string") return includesGroup(parsed.split(","));
  } catch {
    // HTTP API JWT claims can also arrive as a comma-separated string.
  }
  return includesGroup(claim.split(","));
}

export function sortRevisions(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...items].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

export function summarizePublicationReadiness(item: Record<string, unknown>): { ready: boolean; errors: string[] } {
  const candidate = { ...item, status: "published" } as Partial<ContentRecord>;
  const errors = [...validateForPublish(candidate), ...validatePublicationApproval(candidate)];
  if (Array.isArray(candidate.sources) && candidate.sources.some((source) => source.rightsStatus !== "verified" && source.rightsStatus !== "reference-only")) {
    errors.push("source rights must be verified or reference-only");
  }
  return { ready: errors.length === 0, errors: [...new Set(errors)] };
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!hasAdminGroup(claims)) {
    const groupsClaim = claims?.["cognito:groups"];
    console.warn("Admin group membership rejected", {
      claimKeys: claims ? Object.keys(claims) : [],
      groupsClaimType: typeof groupsClaim,
      groupsClaimIsArray: Array.isArray(groupsClaim),
      groupsClaim,
      expectedGroup: process.env.ADMIN_GROUP_NAME ?? "admin",
    });
    return jsonResponse(403, { message: "Admin group membership is required" });
  }
  const tableName = process.env.CONTENT_TABLE_NAME;
  const revisionTableName = process.env.REVISION_TABLE_NAME;
  if (!tableName || !revisionTableName) return jsonResponse(503, { message: "Admin API is not configured" });

  const method = event.requestContext.http.method;
  if (method === "GET") {
    const revisionsFor = event.queryStringParameters?.revisionsFor;
    if (revisionsFor) {
      const result = await documentClient.send(new QueryCommand({
        TableName: revisionTableName,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: { "#id": "id" },
        ExpressionAttributeValues: { ":id": revisionsFor },
      }));
      return jsonResponse(200, { items: sortRevisions((result.Items ?? []) as Record<string, unknown>[]) });
    }
    const requestedStatus = event.queryStringParameters?.status;
    if (requestedStatus && !isContentStatus(requestedStatus)) {
      return jsonResponse(400, { message: "Invalid content status filter" });
    }
    const statuses = requestedStatus ? [requestedStatus] : ["draft", "review", "published", "archived"];
    const results = await Promise.all(statuses.map((status) => documentClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: "status-updated-index",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status },
      ScanIndexForward: false,
    }))));
    const items = results.flatMap((result) => result.Items ?? [])
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
      .map((item) => ({
        ...item,
        publicationReadiness: summarizePublicationReadiness(item as Record<string, unknown>),
        freshness: getContentFreshness(item as Record<string, unknown>, new Date(), Number(process.env.MAINTENANCE_MAX_AGE_DAYS ?? DEFAULT_MAX_AGE_DAYS)),
      }));
    return jsonResponse(200, { items });
  }

  if (method !== "PUT" && method !== "POST") return jsonResponse(405, { message: "Method not allowed" });
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  let parsed: unknown;
  try { parsed = JSON.parse(event.body); } catch { return jsonResponse(400, { message: "Request body must be valid JSON" }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonResponse(400, { message: "Request body must be a JSON object" });
  const input = parsed as Partial<ContentRecord>;
  const inputErrors = validateContentWrite(input);
  if (inputErrors.length > 0) return jsonResponse(422, { message: "Invalid content input", errors: inputErrors });
  const updatedBy = event.requestContext.authorizer?.jwt?.claims?.sub ?? "unknown";
  const now = new Date().toISOString();
  const normalizedReviewEvidence = input.reviewEvidence ? (() => {
    const evidence = { ...input.reviewEvidence };
    delete evidence.approvedAt;
    delete evidence.approvedBy;
    return evidence.approvalStatus === "approved" ? { ...evidence, approvedAt: now, approvedBy: updatedBy } : evidence;
  })() : undefined;
  const normalizedInput = normalizedReviewEvidence ? { ...input, reviewEvidence: normalizedReviewEvidence } : input;
  const errors = normalizedInput.status === "published"
    ? [...validateForPublish(normalizedInput), ...validatePublicationApproval(normalizedInput)]
    : normalizedInput.status === "review" ? validateForReview(normalizedInput) : [];
  if (normalizedInput.status === "published" && errors.length > 0) return jsonResponse(422, { message: "Content cannot be published", errors });
  if (normalizedInput.status === "review" && errors.length > 0) return jsonResponse(422, { message: "Content cannot enter review", errors });

  if (normalizedInput.status === "published" && normalizedInput.sources?.some((source) => source.rightsStatus !== "verified" && source.rightsStatus !== "reference-only")) {
    return jsonResponse(422, { message: "Content cannot be published until every source has verified or reference-only rights", errors: ["source rights must be verified or reference-only"] });
  }

  const publicationApproval = normalizedInput.status === "published" && normalizedInput.publicationApproval ? {
    confirmed: true,
    note: normalizedInput.publicationApproval.note,
    approvedAt: now,
    approvedBy: updatedBy,
  } : normalizedInput.publicationApproval;
  const item = { ...normalizedInput, ...(publicationApproval ? { publicationApproval } : {}), id: normalizedInput.id ?? randomUUID(), createdAt: normalizedInput.createdAt ?? now, updatedAt: now, status: normalizedInput.status ?? "draft" };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: item }));
  await documentClient.send(new PutCommand({ TableName: revisionTableName, Item: { id: item.id, revisionId: randomUUID(), contentId: item.id, action: normalizedInput.id ? "updated" : "created", snapshot: item, updatedBy, createdAt: now } }));
  return jsonResponse(200, { item, updatedBy });
};
