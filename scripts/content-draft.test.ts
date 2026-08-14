import { describe, expect, it } from "vitest";
import { validateDraft } from "./content-draft";

const reviewContent = {
  status: "review",
  kind: "skincare",
  titleJa: "検証待ち商品",
  koreanName: "검증 대기 제품",
  slug: "review-product",
  summary: "出典確認中の要約",
  body: ["出典に基づく本文"],
  lastVerifiedAt: "2026-08-14",
  sources: [{
    title: "Official source",
    url: "https://example.com/product",
    checkedAt: "2026-08-14",
    sourceType: "manual-reference",
    rightsStatus: "reference-only",
    extractionMethod: "manual",
  }],
  isFixture: false,
};

describe("validateDraft", () => {
  it("accepts a review registration checklist without publishing it", () => {
    expect(validateDraft(reviewContent)).toEqual({ status: "review", errors: [] });
  });

  it("rejects fixtures and incomplete published content", () => {
    const reviewResult = validateDraft({ ...reviewContent, isFixture: true });
    const publishedResult = validateDraft({ ...reviewContent, status: "published", details: undefined });

    expect(reviewResult.errors).toContain("fixture content cannot enter the review workflow");
    expect(publishedResult.errors).toContain("details for product content are required");
  });

  it("requires an explicit workflow status", () => {
    expect(validateDraft({ titleJa: "Draft" }).errors).toContain("status is required; use draft, review, or published");
  });
});
