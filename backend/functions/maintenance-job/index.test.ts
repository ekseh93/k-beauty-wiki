import { describe, expect, it } from "vitest";
import { findStalePublishedContent } from "./index";

describe("maintenance freshness checks", () => {
  it("finds missing, invalid, and older published content only", () => {
    const asOf = new Date("2026-08-21T00:00:00.000Z");
    const items = [
      { id: "missing-date", status: "published" },
      { id: "invalid-date", status: "published", lastVerifiedAt: "not-a-date" },
      { id: "old-content", status: "published", lastVerifiedAt: "2026-01-01" },
      { id: "fresh-content", status: "published", lastVerifiedAt: "2026-08-16" },
      { id: "review-content", status: "review", lastVerifiedAt: "2025-01-01" },
    ];

    expect(findStalePublishedContent(items, asOf, 180)).toEqual(["missing-date", "invalid-date", "old-content"]);
  });

  it("uses at least one day even when given an invalid age", () => {
    expect(findStalePublishedContent([
      { id: "older-than-one-day", status: "published", lastVerifiedAt: "2026-08-19" },
    ], new Date("2026-08-21T00:00:00.000Z"), 0)).toEqual(["older-than-one-day"]);
  });
});
