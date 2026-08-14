import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { corsHeaders, jsonResponse, validateForPublish, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function filterPublicContentItems(items: Record<string, unknown>[], kind?: string, query = ""): Record<string, unknown>[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
  return items.filter((item) => {
    if (item.status !== "published" || item.isFixture === true || validateForPublish(item as Partial<ContentRecord>).length > 0) return false;
    if (kind && item.kind !== kind) return false;
    if (!normalizedQuery) return true;
    return [item.titleJa, item.koreanName, item.summary, ...stringList(item.tags), ...stringList(item.aliases)]
      .filter((value): value is string => typeof value === "string")
      .join(" ").toLocaleLowerCase("ja-JP").includes(normalizedQuery);
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") return { statusCode: 204, headers: corsHeaders() };
  const tableName = process.env.CONTENT_TABLE_NAME;
  if (!tableName) return jsonResponse(503, { message: "Content API is not configured" });

  const query = event.queryStringParameters?.q ?? "";
  const kind = event.queryStringParameters?.kind;
  const result = await documentClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: "status-updated-index",
    KeyConditionExpression: "#status = :published",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":published": "published" },
    ScanIndexForward: false,
  }));

  const items = filterPublicContentItems((result.Items ?? []) as Record<string, unknown>[], kind, query);

  return jsonResponse(200, { items });
};
