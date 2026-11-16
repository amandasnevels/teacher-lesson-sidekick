import { expect, type Page } from "@playwright/test";

/** Opens the sample workspace (no personal data) so a test can skip the opening chooser. */
export async function openApp(page: Page) {
  await page.goto("/?start=sample");
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

/**
 * A new Whole Group workspace trimmed down to just its required CHAMPS (Whole Group is the one
 * kind where Voice Level is optional), so a test can add exactly the widgets it needs.
 */
export async function champsOnlyWorkspace(page: Page, name: string) {
  await page.getByTestId("workspace-select").selectOption("__new");
  const dlg = page.getByTestId("new-workspace-dialog");
  await dlg.getByRole("radio", { name: /Whole Group/ }).click();
  await dlg.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  // Remove everything except CHAMPS.
  const others = page.locator("[data-widget-id]").filter({ hasNot: page.locator('[data-testid="widget-champs"]') });
  while ((await others.count()) > 0) {
    await others.first().getByRole("button", { name: /^More options for/ }).click();
    await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator("[data-widget-id]")).toHaveCount(1);
}
