import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mocks.send }) },
  PutCommand: class { constructor(readonly input: unknown) {} },
  QueryCommand: class { constructor(readonly input: unknown) {} },
}));

import { handler } from "./index";

const source = {
  title: "コミュニティ投稿一覧",
  url: "https://example.com/community-posts",
  checkedAt: "2026-08-16",
  sourceType: "community-review" as const,
  rightsStatus: "reference-only" as const,
  extractionMethod: "no-automation" as const,
};

const reviewPayload = {
  kind: "skincare" as const,
  titleJa: "検証用レビュー集計",
  koreanName: "검증용 리뷰 집계",
  slug: "verification-review",
  summary: "複数の公開投稿を原文転載せずに整理した検証用の集計です。",
  body: ["投稿で繰り返し言及された傾向を独自に要約しました。"],
  status: "review" as const,
  lastVerifiedAt: "2026-08-16",
  sources: [source],
  reviewEvidence: {
    platform: "検証用コミュニティ",
    sampleCount: 5,
    independentSourceCount: 1,
    reviewCountAtCollection: 12,
    reviewWindow: "2026-01~2026-08",
    collectedAt: "2026-08-16",
    summary: "原文を保存せず、5件以上の投稿で共通した傾向だけを独自に要約しました。",
    sourceUrls: [source.url],
  },
  relatedSlugs: [],
  isFixture: false,
};

function eventFor(body: unknown) {
  return {
    requestContext: {
      http: { method: "POST" },
      authorizer: { jwt: { claims: { "cognito:groups": ["admin"], sub: "test-admin" } } },
    },
    body: JSON.stringify(body),
  } as never;
}

describe("admin content handler review workflow", () => {
  beforeEach(() => {
    mocks.send.mockReset();
    process.env.CONTENT_TABLE_NAME = "content-table";
    process.env.REVISION_TABLE_NAME = "revision-table";
    process.env.ADMIN_GROUP_NAME = "admin";
  });

  it("stores review content with evidence and a revision without publishing it", async () => {
    const response = await handler(eventFor(reviewPayload));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ item: { status: "review" }, updatedBy: "test-admin" });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("rejects community review content without evidence before DynamoDB writes", async () => {
    const response = await handler(eventFor({ ...reviewPayload, reviewEvidence: undefined }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(422);
    expect(body.message).toBe("Content cannot enter review");
    expect(body.errors).toContain("reviewEvidence is required when a community-review source is included");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects review evidence that is not linked to a community-review source", async () => {
    const response = await handler(eventFor({
      ...reviewPayload,
      sources: [{
        ...source,
        sourceType: "official-api" as const,
      }],
    }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(422);
    expect(body.message).toBe("Content cannot enter review");
    expect(body.errors).toContain("reviewEvidence requires a community-review source");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects publication when a source still needs rights review before DynamoDB writes", async () => {
    const response = await handler(eventFor({
      ...reviewPayload,
      status: "published",
      details: {
        kind: "product",
        brand: "ブランド",
        productType: "美容液",
        volume: "30 ml",
        price: "3000",
        currency: "JPY",
        pricePerVolume: "100 JPY/ml",
        priceCheckedAt: "2026-08-16",
        keyIngredients: [{ name: "成分", role: "一般的な役割" }],
        skinTypes: ["全肌質"],
        usage: ["適量を使う"],
        pros: ["検証用"],
        considerations: ["肌に合わない場合は使用を中止する"],
      },
      sources: [{ ...source, rightsStatus: "needs-review" as const }],
    }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(422);
    expect(body.message).toBe("Content cannot be published");
    expect(body.errors).toContain("sources[0] does not have publishable rights status");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
