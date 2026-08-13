import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { jsonResponse, validateForPublish, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const tableName = process.env.CONTENT_TABLE_NAME;
  const revisionTableName = process.env.REVISION_TABLE_NAME;
  if (!tableName || !revisionTableName) return jsonResponse(503, { message: "Admin API is not configured" });

  const method = event.requestContext.http.method;
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
