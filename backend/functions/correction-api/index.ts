import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { jsonResponse } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type CorrectionStatus = "open" | "in_review" | "resolved" | "rejected";

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const method = event.requestContext.http.method;
  const tableName = process.env.CORRECTION_TABLE_NAME;
  if (!tableName) return jsonResponse(503, { message: "Correction API is not configured" });

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
    await documentClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: input.id.trim() },
      UpdateExpression: "SET #status = :status, resolutionNote = :resolutionNote, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": input.status, ":resolutionNote": input.resolutionNote?.trim() ?? "", ":updatedAt": now },
    }));
    return jsonResponse(200, { id: input.id.trim(), status: input.status, updatedAt: now });
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
