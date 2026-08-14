import { describe, expect, it } from "vitest";
import { validateContentWrite, validateForPublish, type ContentRecord } from "./content";

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

  it("requires at least five samples for community evidence", () => {
    const errors = validateForPublish({
      ...validContent,
      reviewEvidence: {
        sampleCount: 4,
        independentSourceCount: 1,
        collectedAt: "2026-08-14",
        summary: "커뮤니티에서 반복적으로 언급된 장단점을 요약했습니다.",
        sourceUrls: ["https://example.com/community-post"],
      },
    });

    expect(errors).toContain("reviewEvidence.sampleCount must be at least 5");
  });

  it("requires structured product details before publication", () => {
    const errors = validateForPublish({ ...validContent, details: undefined });
    expect(errors).toContain("details for product content are required");
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
