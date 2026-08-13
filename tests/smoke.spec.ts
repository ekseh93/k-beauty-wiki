import { expect, test } from "@playwright/test";

test("home page exposes the Japanese project purpose", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/K-Beauty Atlas Japan/);
  await expect(page.getByRole("heading", { name: /韓国美容を/ })).toBeVisible();
  await expect(page.getByText("コンテンツを探す").first()).toBeVisible();
});
