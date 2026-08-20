import { describe, expect, it } from "vitest";
import { hasAdminGroup, sortRevisions, summarizePublicationReadiness } from "./index";

describe("admin group authorization", () => {
  it("accepts an array claim containing admin", () => {
    expect(hasAdminGroup({ "cognito:groups": ["admin"] })).toBe(true);
  });

  it("accepts a serialized or comma-separated claim", () => {
    expect(hasAdminGroup({ "cognito:groups": '["editor","admin"]' })).toBe(true);
    expect(hasAdminGroup({ "cognito:groups": "editor,admin" })).toBe(true);
    expect(hasAdminGroup({ "cognito:groups": '"admin"' })).toBe(true);
    expect(hasAdminGroup({ "cognito:groups": "[admin]" })).toBe(true);
  });

  it("rejects missing or unrelated groups", () => {
    expect(hasAdminGroup(undefined)).toBe(false);
    expect(hasAdminGroup({ "cognito:groups": ["editor"] })).toBe(false);
  });
});

describe("revision history", () => {
  it("sorts revisions from newest to oldest", () => {
    expect(sortRevisions([
      { revisionId: "old", createdAt: "2026-08-14T01:00:00.000Z" },
      { revisionId: "new", createdAt: "2026-08-15T01:00:00.000Z" },
    ]).map((item) => item.revisionId)).toEqual(["new", "old"]);
  });
});

describe("publication readiness", () => {
  it("reports missing publication requirements without mutating the item", () => {
    const item = { status: "review", slug: "incomplete-item", sources: [] };
    const readiness = summarizePublicationReadiness(item);

    expect(readiness.ready).toBe(false);
    expect(readiness.errors).toContain("at least one source is required");
    expect(item).toEqual({ status: "review", slug: "incomplete-item", sources: [] });
  });
});
