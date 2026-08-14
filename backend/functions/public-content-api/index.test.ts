import { describe, expect, it } from "vitest";
import { filterPublicContentItems } from "./index";

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
