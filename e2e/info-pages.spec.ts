import { expect, test } from "@playwright/test";

test("privacy policy and support pages are public and linked from the welcome screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("student information stays on the teacher’s own device", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Microphone" })).toBeVisible();
  await page.getByRole("link", { name: "Support", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "hello@nevellabs.com" }).first()).toHaveAttribute("href", "mailto:hello@nevellabs.com");
});
