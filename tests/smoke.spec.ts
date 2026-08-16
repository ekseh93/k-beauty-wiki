import { expect, test } from "@playwright/test";

test("home page exposes the Japanese project purpose", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/K-Beauty Atlas Japan/);
  await expect(page.getByRole("heading", { name: /韓国美容を/ })).toBeVisible();
  await expect(page.getByText("コンテンツを探す").first()).toBeVisible();
});

test("content explorer compares up to three public items", async ({ page }) => {
  await page.goto("/content");
  await expect(page.getByText(/件のコンテンツ/)).toBeVisible();

  const compareButtons = page.getByRole("button", { name: "比較に追加" });
  await expect(compareButtons).toHaveCount(3);
  await compareButtons.nth(0).click();
  await compareButtons.nth(1).click();

  await expect(page.getByRole("region", { name: "比較表" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "共通基準で比較" })).toBeVisible();
  await expect(page.getByText("最終確認日")).toBeVisible();
});
