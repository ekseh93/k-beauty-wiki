import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { corsHeaders, jsonResponse, validateForPublish, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.requestContext.http.method === "OPTIONS") return { statusCode: 204, headers: corsHeaders() };
  const tableName = process.env.CONTENT_TABLE_NAME;
  if (!tableName) return jsonResponse(503, { message: "Content API is not configured" });

  const query = event.queryStringParameters?.q?.trim().toLocaleLowerCase("ja-JP") ?? "";
  const kind = event.queryStringParameters?.kind;
  const result = await documentClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: "status-updated-index",
    KeyConditionExpression: "#status = :published",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":published": "published" },
    ScanIndexForward: false,
  }));

  const items = (result.Items ?? []).filter((item) => {
    if (item.isFixture === true || validateForPublish(item as Partial<ContentRecord>).length > 0) return false;
    if (kind && item.kind !== kind) return false;
    if (!query) return true;
    return [item.titleJa, item.koreanName, item.summary, ...(item.tags ?? []), ...(item.aliases ?? [])]
      .join(" ").toLocaleLowerCase("ja-JP").includes(query);
  });

  return jsonResponse(200, { items });
};
