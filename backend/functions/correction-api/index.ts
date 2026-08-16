import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { jsonResponse, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type CorrectionStatus = "open" | "in_review" | "resolved" | "rejected";

async function holdPublishedReviewEvidence(slug: string, now: string, updatedBy: string, reason: string): Promise<boolean> {
  const contentTableName = process.env.CONTENT_TABLE_NAME;
  const revisionTableName = process.env.REVISION_TABLE_NAME;
  if (!contentTableName || !revisionTableName) return false;

  const result = await documentClient.send(new ScanCommand({
    TableName: contentTableName,
    FilterExpression: "#slug = :slug",
    ExpressionAttributeNames: { "#slug": "slug" },
    ExpressionAttributeValues: { ":slug": slug },
  }));
  const content = (result.Items ?? []).find((item) => item.slug === slug) as ContentRecord | undefined;
  if (!content?.reviewEvidence) return false;

  const reviewEvidence = { ...content.reviewEvidence };
  delete reviewEvidence.approvedAt;
  delete reviewEvidence.approvedBy;
  const item = {
    ...content,
    status: content.status === "published" ? "review" as const : content.status,
    updatedAt: now,
    reviewEvidence: { ...reviewEvidence, approvalStatus: "pending" as const, approvalNote: reason },
  };
  await documentClient.send(new PutCommand({ TableName: contentTableName, Item: item }));
  await documentClient.send(new PutCommand({
    TableName: revisionTableName,
    Item: { id: item.id, revisionId: randomUUID(), contentId: item.id, action: "updated", snapshot: item, updatedBy, createdAt: now },
  }));
  return true;
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const method = event.requestContext.http.method;
  const tableName = process.env.CORRECTION_TABLE_NAME;
  if (!tableName) return jsonResponse(503, { message: "Correction API is not configured" });

  if ((method === "GET" || method === "PUT") && !hasAdminGroup(event.requestContext.authorizer?.jwt?.claims)) {
    return jsonResponse(403, { message: "Admin group membership is required" });
  }

  if (method === "GET") {
    const status = event.queryStringParameters?.status;
    if (status && !isCorrectionStatus(status)) return jsonResponse(422, { message: "Invalid correction status" });
    const result = await documentClient.send(new ScanCommand({
      TableName: tableName,
      ...(status ? { FilterExpression: "#status = :status", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":status": status } } : {}),
    }));
    const items = (result.Items ?? []).sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
    return jsonResponse(200, { items });
  }

  if (method === "PUT") {
    if (!event.body) return jsonResponse(400, { message: "Request body is required" });
    let input: { id?: string; status?: CorrectionStatus; resolutionNote?: string };
    try { input = JSON.parse(event.body) as typeof input; } catch { return jsonResponse(400, { message: "Request body must be valid JSON" }); }
    if (!input.id?.trim() || !input.status || !isCorrectionStatus(input.status)) return jsonResponse(422, { message: "id and a valid status are required" });
    const now = new Date().toISOString();
    const requestResult = await documentClient.send(new GetCommand({ TableName: tableName, Key: { id: input.id.trim() } }));
    if (!requestResult.Item) return jsonResponse(404, { message: "Correction request not found" });
    const requestType = requestResult.Item.requestType === "rights" ? "rights" : "correction";
    const shouldHoldReview = (input.status === "open" || input.status === "in_review") && Boolean(requestResult.Item.slug);
    const updatedBy = event.requestContext.authorizer?.jwt?.claims?.sub ?? "unknown";
    const contentMarkedForReview = shouldHoldReview
      ? await holdPublishedReviewEvidence(String(requestResult.Item.slug), now, updatedBy, `${requestType === "rights" ? "권리" : "정정"} 요청으로 리뷰 근거 재검토 필요`)
      : false;
    await documentClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: input.id.trim() },
      UpdateExpression: "SET #status = :status, resolutionNote = :resolutionNote, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": input.status, ":resolutionNote": input.resolutionNote?.trim() ?? "", ":updatedAt": now },
    }));
    return jsonResponse(200, { id: input.id.trim(), status: input.status, updatedAt: now, contentMarkedForReview });
  }

  if (method !== "POST") return jsonResponse(405, { message: "Method not allowed" });
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  let input: { slug?: string; message?: string; sourceUrl?: string; contact?: string; requestType?: "correction" | "rights" };
  try { input = JSON.parse(event.body) as typeof input; } catch { return jsonResponse(400, { message: "Request body must be valid JSON" }); }
  if (!input.slug?.trim() || !input.message?.trim()) return jsonResponse(422, { message: "slug and message are required" });
  if (input.requestType && input.requestType !== "correction" && input.requestType !== "rights") {
    return jsonResponse(422, { message: "requestType must be correction or rights" });
  }
  if (input.sourceUrl && !isHttpUrl(input.sourceUrl)) return jsonResponse(422, { message: "sourceUrl must be an http(s) URL" });

  const item = { id: randomUUID(), slug: input.slug.trim(), message: input.message.trim(), sourceUrl: input.sourceUrl?.trim() ?? "", contact: input.contact?.trim() ?? "", requestType: input.requestType ?? "correction", status: "open", createdAt: new Date().toISOString() };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: item }));
  return jsonResponse(201, { id: item.id, status: item.status });
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isCorrectionStatus(value: string): value is CorrectionStatus {
  return value === "open" || value === "in_review" || value === "resolved" || value === "rejected";
}

function hasAdminGroup(claims: Record<string, unknown> | undefined, groupName = process.env.ADMIN_GROUP_NAME ?? "admin"): boolean {
  const claim = claims?.["cognito:groups"];
  const values = Array.isArray(claim) ? claim : typeof claim === "string" ? claim.split(",") : [];
  return values.some((value) => typeof value === "string" && value.trim().replace(/^\[|\]$/g, "").replace(/^['\"]|['\"]$/g, "") === groupName);
}
