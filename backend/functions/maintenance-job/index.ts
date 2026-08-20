import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";
import { DEFAULT_MAX_AGE_DAYS, findStalePublishedContent } from "../../shared/content-freshness";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function configuredMaxAgeDays(): number {
  const value = Number.parseInt(process.env.MAINTENANCE_MAX_AGE_DAYS ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_AGE_DAYS;
}

export const handler: Handler = async () => {
  const tableName = process.env.CONTENT_TABLE_NAME;
  if (!tableName) return { ok: false, message: "Content API is not configured" };
  const result = await documentClient.send(new ScanCommand({ TableName: tableName, ProjectionExpression: "id, #status, lastVerifiedAt", ExpressionAttributeNames: { "#status": "status" } }));
  const maxAgeDays = configuredMaxAgeDays();
  const staleItemIds = findStalePublishedContent((result.Items ?? []) as Record<string, unknown>[], new Date(), maxAgeDays);
  console.log(JSON.stringify({ checked: result.Items?.length ?? 0, staleItems: staleItemIds.length, staleItemIds, maxAgeDays }));
  return { ok: true, checked: result.Items?.length ?? 0, staleItems: staleItemIds.length, staleItemIds, maxAgeDays };
};
