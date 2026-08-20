import { describe, expect, it } from "vitest";
import { COMPARISON_LIMIT, toggleComparisonSelection } from "./comparison";

describe("toggleComparisonSelection", () => {
  it("adds an item until the comparison limit", () => {
    expect(toggleComparisonSelection([], "one")).toEqual(["one"]);
    expect(toggleComparisonSelection(["one", "two"], "three")).toEqual(["one", "two", "three"]);
    expect(toggleComparisonSelection(["one", "two", "three"], "four")).toHaveLength(COMPARISON_LIMIT);
  });

  it("removes an item that is already selected", () => {
    expect(toggleComparisonSelection(["one", "two"], "one")).toEqual(["two"]);
  });

  it("supports a smaller explicit limit without mutating the input", () => {
    const selected = ["one"];
    expect(toggleComparisonSelection(selected, "two", 1)).toEqual(selected);
    expect(selected).toEqual(["one"]);
  });
});
