import { describe, expect, it } from "vitest";
import { validateContentWrite, validateForPublish, validateForReview, type ContentRecord } from "./content";

const validContent: Partial<ContentRecord> = {
  kind: "skincare",
  titleJa: "保湿クリーム",
  koreanName: "보습 크림",
  slug: "moisturizer",
  summary: "건조한 피부에 사용하는 보습 제품입니다.",
  body: ["제품 설명"],
  lastVerifiedAt: "2026-08-14",
  status: "published",
  isFixture: false,
  sources: [{
    title: "브랜드 공식 제품 페이지",
    url: "https://example.com/product",
    checkedAt: "2026-08-14",
    sourceType: "official-api",
    rightsStatus: "verified",
    extractionMethod: "api",
  }],
  details: {
    kind: "product",
    brand: "ブランド",
    productType: "保湿クリーム",
    volume: "50 g",
    price: "2500",
    currency: "JPY",
    pricePerVolume: "50 JPY/g",
    keyIngredients: [{ name: "セラミド", role: "肌のうるおいを保つ成分" }],
    skinTypes: ["乾燥肌"],
    usage: ["適量を塗る"],
    pros: ["使いやすい"],
    considerations: ["肌に合わない場合は使用を中止する"],
    priceCheckedAt: "2026-08-14",
  },
};

describe("validateForPublish", () => {
  it("accepts a rights-verified source", () => {
    expect(validateForPublish(validContent)).toEqual([]);
  });

  it("rejects fixture content and prohibited sources", () => {
    const errors = validateForPublish({
      ...validContent,
      isFixture: true,
      sources: [{ ...validContent.sources?.[0], sourceType: "prohibited", rightsStatus: "rejected" }],
    });

    expect(errors).toContain("fixture content cannot be published");
    expect(errors).toContain("sources[0] is marked prohibited");
    expect(errors).toContain("sources[0] does not have publishable rights status");
  });

  it("rejects a published item with an invalid content kind", () => {
    expect(validateForPublish({ ...validContent, kind: "unknown" as ContentRecord["kind"] })).toContain(
      "kind is required and must be one of treatment, skincare, makeup",
    );
  });

  it("rejects unsupported source metadata values", () => {
    const errors = validateForPublish({
      ...validContent,
      sources: [{ ...validContent.sources?.[0], sourceType: "copied" as never, rightsStatus: "unknown" as never, extractionMethod: "scrape" as never }],
    });

    expect(errors).toContain("sources[0].sourceType must be a supported value");
    expect(errors).toContain("sources[0].rightsStatus must be a supported value");
    expect(errors).toContain("sources[0].extractionMethod must be a supported value");
  });

  it("requires at least five samples for community evidence", () => {
    const errors = validateForPublish({
      ...validContent,
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 4,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "커뮤니티에서 반복적으로 언급된 장단점을 요약했습니다.",
        sourceUrls: ["https://example.com/community-post"],
      },
    });

    expect(errors).toContain("reviewEvidence.sampleCount must be at least 5");
  });

  it("requires explicit editorial approval before publication", () => {
    const errors = validateForPublish({
      ...validContent,
      sources: [{
        ...validContent.sources?.[0],
        url: "https://example.com/community-post",
        sourceType: "community-review",
        rightsStatus: "reference-only",
        extractionMethod: "no-automation",
      }],
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "원문을 복사하지 않은 집계 요약입니다.",
        sourceUrls: ["https://example.com/community-post"],
        approvalStatus: "pending",
      },
    });

    expect(errors).toContain("reviewEvidence.approvalStatus must be approved before publication");
  });

  it("requires evidence when a community-review source is included", () => {
    const errors = validateForPublish({
      ...validContent,
      sources: [{
        ...validContent.sources?.[0],
        sourceType: "community-review",
        rightsStatus: "verified",
        extractionMethod: "no-automation",
      }],
      reviewEvidence: undefined,
    });

    expect(errors).toContain("reviewEvidence is required when a community-review source is included");
  });

  it("requires review evidence URLs to be listed as source records", () => {
    const errors = validateForPublish({
      ...validContent,
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "원문을 복사하지 않은 집계 요약입니다.",
        sourceUrls: ["https://example.com/community-post"],
      },
    });

    expect(errors).toContain("reviewEvidence.sourceUrls must also be listed in sources: https://example.com/community-post");
  });

  it("requires review evidence to use community-review source records", () => {
    const errors = validateForReview({
      ...validContent,
      status: "review",
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "원문을 복사하지 않은 집계 요약입니다.",
        sourceUrls: ["https://example.com/product"],
      },
    });

    expect(errors).toContain("reviewEvidence requires a community-review source");
    expect(errors).toContain("reviewEvidence.sourceUrls must refer to community-review sources: https://example.com/product");
  });

  it("does not allow independent source count to exceed evidence URLs", () => {
    const errors = validateForReview({
      ...validContent,
      status: "review",
      sources: [{
        ...validContent.sources?.[0],
        sourceType: "community-review",
        rightsStatus: "reference-only",
        extractionMethod: "no-automation",
      }],
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 2,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "원문을 복사하지 않은 집계 요약입니다.",
        sourceUrls: ["https://example.com/product"],
      },
    });

    expect(errors).toContain("reviewEvidence.independentSourceCount must not exceed sourceUrls count");
  });

  it("rejects duplicate review evidence URLs", () => {
    const errors = validateForReview({
      ...validContent,
      status: "review",
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "원문을 복사하지 않은 집계 요약입니다.",
        sourceUrls: ["https://example.com/product", "https://example.com/product"],
      },
    });

    expect(errors).toContain("reviewEvidence.sourceUrls must not contain duplicates");
  });

  it("requires structured product details before publication", () => {
    const errors = validateForPublish({ ...validContent, details: undefined });
    expect(errors).toContain("details for product content are required");
  });
});

describe("validateForReview", () => {
  it("accepts source-backed review content without requiring product details", () => {
    const reviewContent = { ...validContent, status: "review" as const, details: undefined };
    expect(validateForReview(reviewContent)).toEqual([]);
  });

  it("rejects incomplete review content before it reaches DynamoDB", () => {
    const errors = validateForReview({ status: "review", kind: "skincare", sources: [] });
    expect(errors).toContain("titleJa is required");
    expect(errors).toContain("at least one source is required");
    expect(errors).toContain("lastVerifiedAt is required");
  });

  it("handles malformed source entries without throwing", () => {
    expect(validateForReview({ ...validContent, sources: [null as never] })).toContain("sources[0] must be an object");
    expect(validateForReview({ ...validContent, sources: "invalid" as never })).toContain("sources must be an array");
  });

  it("returns validation errors for malformed source fields instead of throwing", () => {
    const errors = validateForReview({
      ...validContent,
      status: "review",
      sources: [{
        ...validContent.sources?.[0],
        title: 123,
        url: { invalid: true },
        checkedAt: 20260814,
      }] as never,
    });

    expect(errors).toEqual(expect.arrayContaining([
      "sources[0].title is required",
      "sources[0].url must be an http(s) URL",
      "sources[0].checkedAt must be an ISO date (YYYY-MM-DD)",
    ]));
  });

  it("returns validation errors for malformed review evidence instead of throwing", () => {
    const errors = validateForReview({
      ...validContent,
      status: "review",
      reviewEvidence: {
        platform: "테스트 플랫폼",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 5,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: 123,
        sourceUrls: "https://example.com/post",
      } as never,
    });

    expect(errors).toEqual(expect.arrayContaining([
      "reviewEvidence.summary is required",
      "reviewEvidence.sourceUrls must contain http(s) URLs",
    ]));
  });
});

describe("validateContentWrite", () => {
  it("accepts the supported content states and kinds", () => {
    expect(validateContentWrite({ status: "review", kind: "treatment", sources: [], relatedSlugs: [] })).toEqual([]);
  });

  it("rejects unknown state, kind, and non-array fields", () => {
    const errors = validateContentWrite({
      status: "ready" as ContentRecord["status"],
      kind: "other" as ContentRecord["kind"],
      sources: "source" as unknown as ContentRecord["sources"],
      relatedSlugs: "related" as unknown as ContentRecord["relatedSlugs"],
    });

    expect(errors).toEqual([
      "status must be one of draft, review, published, archived",
      "kind must be one of treatment, skincare, makeup",
      "sources must be an array",
      "relatedSlugs must be an array",
    ]);

    expect(validateContentWrite({ sources: [null as unknown as ContentRecord["sources"][number]] })).toContain("sources entries must be objects");
  });
});
