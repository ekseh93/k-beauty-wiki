import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("keeps the COSRX research draft source-backed and unpublished", () => {
    const filePath = resolve(process.cwd(), "docs/research/cosrx-advanced-snail-96-mucin-power-essence.review.json");
    const content = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const result = validateDraft(content);

    expect(result).toEqual({ status: "review", errors: [] });
    expect(content.status).toBe("review");
    expect(content.isFixture).toBe(false);
    expect(content.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ rightsStatus: "reference-only" }),
    ]));
  });
});
