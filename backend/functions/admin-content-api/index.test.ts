import { describe, expect, it } from "vitest";
import { hasAdminGroup } from "./index";

describe("admin group authorization", () => {
  it("accepts an array claim containing admin", () => {
    expect(hasAdminGroup({ "cognito:groups": ["admin"] })).toBe(true);
  });

  it("accepts a serialized or comma-separated claim", () => {
    expect(hasAdminGroup({ "cognito:groups": '["editor","admin"]' })).toBe(true);
    expect(hasAdminGroup({ "cognito:groups": "editor,admin" })).toBe(true);
    expect(hasAdminGroup({ "cognito:groups": '"admin"' })).toBe(true);
  });

  it("rejects missing or unrelated groups", () => {
    expect(hasAdminGroup(undefined)).toBe(false);
    expect(hasAdminGroup({ "cognito:groups": ["editor"] })).toBe(false);
  });
});
