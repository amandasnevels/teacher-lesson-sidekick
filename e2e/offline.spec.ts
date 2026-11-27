import { expect, test } from "@playwright/test";

test("after one visit, Sidekick opens and works with no internet", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("workspace-chooser")).toBeVisible();
  // Wait until the app has been saved on the device.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(page.getByTestId("offline-status")).toContainText("ready to use offline");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome to Teacher Sidekick!" })).toBeVisible();
  await page.getByRole("button", { name: "Open Essential Teacher Tools", exact: true }).click();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  // Pictures (CHAMPS cards) load from the device.
  const champs = page.locator('[data-testid="widget-champs"]');
  await expect.poll(() => champs.locator("img").evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth > 0).length)).toBeGreaterThan(5);
  // Lazy-loaded data (TEKS search) is there too.
  await page.locator('[data-testid="widget-ican"]').getByRole("button", { name: "Find TEKS" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/couldn't|failed|offline/i)).toHaveCount(0);
  await page.keyboard.press("Escape");
  // A timer runs.
  await page.getByRole("button", { name: "Start timer" }).first().click();
  await expect(page.getByTestId("timer-status").first()).toHaveText("Running");
  // A refresh while offline keeps the session.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  await context.setOffline(false);
});
