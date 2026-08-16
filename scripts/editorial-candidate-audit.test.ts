import { describe, expect, it } from "vitest";
import { auditEditorialCandidate } from "./audit-editorial-candidates";

const productDraft = {
  id: "review-product",
  kind: "skincare",
  titleJa: "商品",
  koreanName: "제품",
  slug: "review-product",
  summary: "確認済みの要約",
  body: ["確認済みの本文"],
  tags: ["スキンケア"],
  aliases: [],
  status: "review",
  lastVerifiedAt: "2026-08-16",
  sources: [{
    title: "公式商品ページ",
    url: "https://example.com/product",
    checkedAt: "2026-08-16",
    sourceType: "manual-reference",
    rightsStatus: "reference-only",
    extractionMethod: "manual",
  }],
  updatedAt: "2026-08-16T00:00:00.000Z",
  createdAt: "2026-08-16T00:00:00.000Z",
  relatedSlugs: [],
};

describe("editorial candidate audit", () => {
  it("reports missing product details as a publication blocker", () => {
    const result = auditEditorialCandidate(productDraft, "product.review.json");

    expect(result.structurallyReady).toBe(true);
    expect(result.automatedPublishChecksPassed).toBe(false);
    expect(result.manualApprovalRequired).toBe(true);
    expect(result.publicPublicationAllowed).toBe(false);
    expect(result.blockingReasons).toContain("details for product content are required");
    expect(result.rightsStatus["reference-only"]).toBe(1);
  });

  it("marks a complete source-backed product as a candidate without changing its review status", () => {
    const result = auditEditorialCandidate({
      ...productDraft,
      details: {
        kind: "product",
        brand: "ブランド",
        productType: "美容液",
        volume: "50mL",
        price: "2,000 JPY",
        currency: "JPY",
        pricePerVolume: "40 JPY/mL",
        keyIngredients: [{ name: "成分", role: "表示成分名として確認" }],
        skinTypes: ["商品説明の範囲で記録"],
        usage: ["公式使用方法を確認"],
        pros: ["商品仕様の整理"],
        considerations: ["現行表示を確認"],
        priceCheckedAt: "2026-08-16",
      },
    }, "product.review.json");

    expect(result.status).toBe("review");
    expect(result.automatedPublishChecksPassed).toBe(true);
    expect(result.manualApprovalRequired).toBe(true);
    expect(result.publicPublicationAllowed).toBe(false);
    expect(result.blockingReasons).toEqual([]);
  });
});
