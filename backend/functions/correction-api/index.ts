import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { jsonResponse } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method !== "POST") return jsonResponse(405, { message: "Method not allowed" });
  const tableName = process.env.CORRECTION_TABLE_NAME;
  if (!tableName) return jsonResponse(503, { message: "Correction API is not configured" });
  if (!event.body) return jsonResponse(400, { message: "Request body is required" });

  let input: { slug?: string; message?: string; sourceUrl?: string; contact?: string };
  try { input = JSON.parse(event.body) as typeof input; } catch { return jsonResponse(400, { message: "Request body must be valid JSON" }); }
  if (!input.slug?.trim() || !input.message?.trim()) return jsonResponse(422, { message: "slug and message are required" });

  const item = { id: randomUUID(), slug: input.slug.trim(), message: input.message.trim(), sourceUrl: input.sourceUrl?.trim() ?? "", contact: input.contact?.trim() ?? "", status: "open", createdAt: new Date().toISOString() };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: item }));
  return jsonResponse(201, { id: item.id, status: item.status });
};
