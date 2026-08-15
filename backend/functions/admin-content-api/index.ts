import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { isContentStatus, jsonResponse, validateContentWrite, validateForPublish, validateForReview, type ContentRecord } from "../../shared/content";

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
    const items = results.flatMap((result) => result.Items ?? []).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
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
  const errors = input.status === "published" ? validateForPublish(input) : input.status === "review" ? validateForReview(input) : [];
  if (input.status === "published" && errors.length > 0) return jsonResponse(422, { message: "Content cannot be published", errors });
  if (input.status === "review" && errors.length > 0) return jsonResponse(422, { message: "Content cannot enter review", errors });

  if (input.status === "published" && input.sources?.some((source) => source.rightsStatus !== "verified" && source.rightsStatus !== "reference-only")) {
    return jsonResponse(422, { message: "Content cannot be published until every source has verified or reference-only rights", errors: ["source rights must be verified or reference-only"] });
  }

  const now = new Date().toISOString();
  const item = { ...input, id: input.id ?? randomUUID(), createdAt: input.createdAt ?? now, updatedAt: now, status: input.status ?? "draft" };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: item }));
  const updatedBy = event.requestContext.authorizer?.jwt?.claims?.sub ?? "unknown";
  await documentClient.send(new PutCommand({ TableName: revisionTableName, Item: { id: item.id, revisionId: randomUUID(), contentId: item.id, action: input.id ? "updated" : "created", snapshot: item, updatedBy, createdAt: now } }));
  return jsonResponse(200, { item, updatedBy });
};
