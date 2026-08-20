import { describe, expect, it } from "vitest";
import { filterPublicContentItems, sanitizePublicContentItem } from "./index";

function publishedProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "skincare",
    titleJa: "CICA Cream",
    koreanName: "CICA 크림",
    slug: "cica-cream",
    summary: "A published product summary",
    body: ["A verified product description"],
    tags: ["skincare"],
    aliases: ["centella"],
    status: "published",
    lastVerifiedAt: "2026-08-14",
    isFixture: false,
    sources: [{
      title: "Official product page",
      url: "https://example.com/product",
      checkedAt: "2026-08-14",
      sourceType: "manual-reference",
      rightsStatus: "reference-only",
      extractionMethod: "manual",
    }],
    details: {
      kind: "product",
      brand: "Example",
      productType: "Cream",
      volume: "50 g",
      price: "2500",
      currency: "JPY",
      pricePerVolume: "50 JPY/g",
      keyIngredients: [{ name: "Centella", role: "Soothing" }],
      skinTypes: ["Sensitive"],
      usage: ["Apply after cleansing"],
      pros: ["Light texture"],
      considerations: ["Check the ingredient list"],
      priceCheckedAt: "2026-08-14",
    },
    ...overrides,
  };
}

describe("filterPublicContentItems", () => {
  it("returns only verified, non-fixture content matching query and kind", () => {
    const valid = publishedProduct();
    const fixture = publishedProduct({ isFixture: true, slug: "fixture-cica-cream" });
    const unverified = publishedProduct({
      slug: "unverified-cica-cream",
      sources: [{
        title: "Unverified source",
        url: "https://example.com/unverified",
        checkedAt: "2026-08-14",
        sourceType: "community-review",
        rightsStatus: "needs-review",
        extractionMethod: "manual",
      }],
    });
    const review = publishedProduct({ status: "review", slug: "review-cica-cream" });

    expect(filterPublicContentItems([valid, fixture, unverified, review], "skincare", "centella")).toEqual([valid]);
    expect(filterPublicContentItems([valid], "makeup")).toEqual([]);
  });

  it("handles malformed searchable fields without exposing the item", () => {
    const valid = publishedProduct({ tags: "skincare", aliases: null });
    expect(filterPublicContentItems([valid], undefined, "cica")).toEqual([valid]);
  });
});

describe("sanitizePublicContentItem", () => {
  it("removes source quotes and keeps only approved review evidence metadata", () => {
    const item = publishedProduct({
      sources: [{
        title: "Community source",
        url: "https://example.com/community",
        checkedAt: "2026-08-14",
        sourceType: "community-review",
        rightsStatus: "reference-only",
        extractionMethod: "no-automation",
        quote: "raw review text must not be public",
      }],
      reviewEvidence: {
        platform: "Example community",
        sampleCount: 5,
        independentSourceCount: 1,
        reviewCountAtCollection: 20,
        reviewWindow: "2026-01~2026-08",
        collectedAt: "2026-08-14",
        summary: "Independent summary",
        sourceUrls: ["https://example.com/community"],
        approvalStatus: "approved",
      },
    });

    const sanitized = sanitizePublicContentItem(item);
    expect(sanitized.sources).toEqual([{ title: "Community source", url: "https://example.com/community", checkedAt: "2026-08-14" }]);
    expect(sanitized).not.toHaveProperty("quote");
    expect(sanitized.reviewEvidence).toMatchObject({ platform: "Example community", sampleCount: 5, reviewCountAtCollection: 20 });
  });

  it("does not expose internal publication approval metadata", () => {
    const sanitized = sanitizePublicContentItem(publishedProduct({
      publicationApproval: {
        confirmed: true,
        note: "Internal approval note",
        approvedAt: "2026-08-14T10:00:00.000Z",
        approvedBy: "admin@example.com",
      },
    }));

    expect(sanitized).not.toHaveProperty("publicationApproval");
  });

  it("exposes only the documented public content fields", () => {
    const sanitized = sanitizePublicContentItem(publishedProduct({
      internalAuditTrail: [{ actor: "admin", action: "approved" }],
      internalModerationNote: "Do not expose this note",
      sourceRightsEvidence: { contractId: "internal-contract" },
    }));

    expect(sanitized).not.toHaveProperty("internalAuditTrail");
    expect(sanitized).not.toHaveProperty("internalModerationNote");
    expect(sanitized).not.toHaveProperty("sourceRightsEvidence");
    expect(sanitized).toHaveProperty("slug", "cica-cream");
  });

  it("does not expose review evidence that is pending editorial approval", () => {
    const sanitized = sanitizePublicContentItem(publishedProduct({
      reviewEvidence: { approvalStatus: "pending", summary: "pending" },
    }));

    expect(sanitized).not.toHaveProperty("reviewEvidence");
  });
});
