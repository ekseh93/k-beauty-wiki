import { describe, expect, it } from "vitest";
import { validateForPublish, type ContentRecord } from "./content";

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
});
