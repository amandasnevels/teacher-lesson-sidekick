import { expect, type Page } from "@playwright/test";

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("widget-grid")).toBeVisible();
}

export const widget = (page: Page, type: string) => page.locator(`[data-testid="widget-${type}"]`).first();

export async function widgetOrder(page: Page) {
  return page.locator("[data-widget-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-widget-id")));
}

/** Wait until the app's debounced autosave has flushed to IndexedDB. */
export async function waitForSave(page: Page) {
  await page.waitForTimeout(700);
}
