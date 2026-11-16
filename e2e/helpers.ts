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
  for (const t of ["Timer", "Clock", "Name Picker", "Soundboard"]) {
    await page.getByRole("button", { name: `More options for ${t}` }).click();
    await page.getByRole("menuitem", { name: "Remove" }).click();
  }
  await expect(page.locator("[data-widget-id]")).toHaveCount(1);
}
