import { describe, expect, it } from "vitest";
import { getContentFreshness } from "./content-freshness";

describe("content freshness", () => {
  const asOf = new Date("2026-08-21T15:00:00.000Z");

  it("uses calendar dates and keeps the cutoff date fresh", () => {
    expect(getContentFreshness({ status: "published", lastVerifiedAt: "2026-02-22" }, asOf, 180).status).toBe("fresh");
    expect(getContentFreshness({ status: "published", lastVerifiedAt: "2026-02-21" }, asOf, 180).status).toBe("stale");
  });

  it("distinguishes missing and invalid dates and ignores non-published content", () => {
    expect(getContentFreshness({ status: "published" }, asOf).status).toBe("missing");
    expect(getContentFreshness({ status: "published", lastVerifiedAt: "2026-02-30" }, asOf).status).toBe("invalid");
    expect(getContentFreshness({ status: "review" }, asOf).status).toBe("not-applicable");
  });
});
