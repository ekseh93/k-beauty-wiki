import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: Handler = async () => {
  const tableName = process.env.CONTENT_TABLE_NAME;
  if (!tableName) return { ok: false, message: "Content API is not configured" };
  const result = await documentClient.send(new ScanCommand({ TableName: tableName, ProjectionExpression: "id, #status, lastVerifiedAt", ExpressionAttributeNames: { "#status": "status" } }));
  const staleItems = (result.Items ?? []).filter((item) => item.status === "published" && !item.lastVerifiedAt);
  console.log(JSON.stringify({ checked: result.Items?.length ?? 0, staleItems: staleItems.length }));
  return { ok: true, checked: result.Items?.length ?? 0, staleItems: staleItems.length };
};
