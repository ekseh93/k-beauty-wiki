import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const DEFAULT_MAX_AGE_DAYS = 180;

function parseDateOnly(value: unknown): Date | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date;
}

export function findStalePublishedContent(items: Record<string, unknown>[], asOf = new Date(), maxAgeDays = DEFAULT_MAX_AGE_DAYS): string[] {
  const asOfDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const ageDays = Number.isFinite(maxAgeDays) ? Math.max(1, Math.floor(maxAgeDays)) : DEFAULT_MAX_AGE_DAYS;
  const cutoff = new Date(asOfDate.getTime() - ageDays * 24 * 60 * 60 * 1000);
  return items
    .filter((item) => {
      if (item.status !== "published") return false;
      const verifiedAt = parseDateOnly(item.lastVerifiedAt);
      return !verifiedAt || verifiedAt < cutoff;
    })
    .map((item) => item.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

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
