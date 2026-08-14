import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { jsonResponse, validateForPublish, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export function hasAdminGroup(claims: Record<string, unknown> | undefined, groupName = process.env.ADMIN_GROUP_NAME ?? "admin"): boolean {
  const claim = claims?.["cognito:groups"];
  if (Array.isArray(claim)) return claim.some((value) => value === groupName);
  if (typeof claim !== "string") return false;
  try {
    const parsed = JSON.parse(claim) as unknown;
    if (Array.isArray(parsed)) return parsed.some((value) => value === groupName);
  } catch {
    // HTTP API JWT claims can also arrive as a comma-separated string.
  }
  return claim.split(",").map((value) => value.trim()).includes(groupName);
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  if (!hasAdminGroup(event.requestContext.authorizer?.jwt?.claims)) {
    return jsonResponse(403, { message: "Admin group membership is required" });
  }
  const tableName = process.env.CONTENT_TABLE_NAME;
  const revisionTableName = process.env.REVISION_TABLE_NAME;
  if (!tableName || !revisionTableName) return jsonResponse(503, { message: "Admin API is not configured" });

  const method = event.requestContext.http.method;
  if (method === "GET") {
    const requestedStatus = event.queryStringParameters?.status;
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

  let input: Partial<ContentRecord>;
  try { input = JSON.parse(event.body) as Partial<ContentRecord>; } catch { return jsonResponse(400, { message: "Request body must be valid JSON" }); }
  const errors = validateForPublish(input);
  if (input.status === "published" && errors.length > 0) return jsonResponse(422, { message: "Content cannot be published", errors });

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
