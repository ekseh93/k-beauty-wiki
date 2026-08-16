import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { corsHeaders, jsonResponse, validateForPublish, type ContentRecord } from "../../shared/content";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function sanitizePublicContentItem(item: Record<string, unknown>): Record<string, unknown> {
  const publicItem = { ...item };
  delete publicItem.reviewEvidence;
  const sources = Array.isArray(item.sources) ? item.sources
    .filter((source): source is Record<string, unknown> => Boolean(source) && typeof source === "object" && !Array.isArray(source))
    .map((source) => ({
      title: source.title,
      url: source.url,
      checkedAt: source.checkedAt,
    })) : [];
  const reviewEvidence = item.reviewEvidence;
  const safeReviewEvidence = reviewEvidence && typeof reviewEvidence === "object" && !Array.isArray(reviewEvidence) && (reviewEvidence as Record<string, unknown>).approvalStatus === "approved"
    ? {
      platform: (reviewEvidence as Record<string, unknown>).platform,
      sampleCount: (reviewEvidence as Record<string, unknown>).sampleCount,
      independentSourceCount: (reviewEvidence as Record<string, unknown>).independentSourceCount,
      reviewCountAtCollection: (reviewEvidence as Record<string, unknown>).reviewCountAtCollection,
      reviewWindow: (reviewEvidence as Record<string, unknown>).reviewWindow,
      collectedAt: (reviewEvidence as Record<string, unknown>).collectedAt,
      summary: (reviewEvidence as Record<string, unknown>).summary,
      sourceUrls: stringList((reviewEvidence as Record<string, unknown>).sourceUrls),
    } : undefined;

  return {
    ...publicItem,
    sources,
    ...(safeReviewEvidence ? { reviewEvidence: safeReviewEvidence } : {}),
  };
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

  return jsonResponse(200, { items: items.map(sanitizePublicContentItem) });
};
