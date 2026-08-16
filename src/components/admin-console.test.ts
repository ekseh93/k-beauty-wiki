import { describe, expect, it } from "vitest";
import { previewStatusMessage } from "./admin-console";

describe("admin preview status guidance", () => {
  it("explains that review content is not public", () => {
    expect(previewStatusMessage("review", false)).toContain("공개 API에는 노출되지 않습니다");
  });

  it("explains why an incomplete published draft is blocked", () => {
    expect(previewStatusMessage("published", false)).toContain("API에서 공개가 차단됩니다");
  });

  it("distinguishes a draft from a publishable item", () => {
    expect(previewStatusMessage("draft", false)).toContain("초안 상태로 저장됩니다");
    expect(previewStatusMessage("published", true)).toContain("서버가 최종 검증한 뒤 공개합니다");
  });
});
