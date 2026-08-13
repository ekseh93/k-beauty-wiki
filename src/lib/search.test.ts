import { describe, expect, it } from "vitest";
import { fixtureContent } from "./content";
import { searchContents } from "./search";

describe("searchContents", () => {
  it("searches Japanese titles, Korean names, aliases, and tags", () => {
    expect(searchContents(fixtureContent, "물광주사")).toHaveLength(1);
    expect(searchContents(fixtureContent, "CICA")).toHaveLength(1);
  });

  it("filters by content kind", () => {
    expect(searchContents(fixtureContent, "", "makeup").every((item) => item.kind === "makeup")).toBe(true);
  });

  it("returns all fixture content for an empty query", () => {
    expect(searchContents(fixtureContent, "")).toHaveLength(fixtureContent.length);
  });
});
