import { expect, test } from "@playwright/test";

test("admin page exposes the Cognito sign-in entry point", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "콘텐츠 관리자 콘솔" })).toBeVisible();

  const signInHeading = page.getByRole("heading", { name: "관리자 로그인" });
  const configurationMessage = page.getByText(/관리자 기능을 사용하려면 Cognito와 API 환경 변수/);
  await expect(signInHeading.or(configurationMessage)).toBeVisible();
});
