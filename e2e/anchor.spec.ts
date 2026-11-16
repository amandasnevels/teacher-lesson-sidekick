import { expect, test } from "@playwright/test";
import { openApp, waitForSave } from "./helpers";

// A small, valid PNG (2×2 white) so the test needs no files.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8DwnwEJMDIgCQAAWqgD/RV9n4UAAAAASUVORK5CYII=", "base64");

test("anchor chart: upload your own, pick from the list, rename, survives a refresh", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  await page.getByRole("button", { name: "Add new Anchor Chart", exact: true }).click();
  const w = page.locator('[data-testid="widget-anchor"]');
  await expect(w.getByText("Add an anchor chart")).toBeVisible();
  await w.getByTestId("anchor-upload").setInputFiles([
    { name: "Prefix Power-Up.png", mimeType: "image/png", buffer: PNG },
    { name: "Vowel_Pattern_Power.png", mimeType: "image/png", buffer: PNG },
  ]);
  const select = w.getByTestId("anchor-select");
  await expect(select.locator("option")).toHaveText(["Prefix Power-Up", "Vowel Pattern Power"]);
  await expect(select.locator("option:checked")).toHaveText("Vowel Pattern Power");
  await expect(w.getByTestId("anchor-image")).toHaveAttribute("alt", "Vowel Pattern Power");
  await select.selectOption({ label: "Prefix Power-Up" });
  await expect(w.getByTestId("anchor-image")).toHaveAttribute("alt", "Prefix Power-Up");
  await w.getByRole("button", { name: "Rename" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Prefixes");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(select.locator("option:checked")).toHaveText("Prefixes");
  // Non-pictures are refused with a clear message.
  await w.getByTestId("anchor-upload").setInputFiles([{ name: "chart.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") }]);
  await expect(w.getByText(/Please choose a picture/)).toBeVisible();
  await waitForSave(page);
  await page.reload();
  await expect(page.locator('[data-testid="widget-anchor"]').getByTestId("anchor-select").locator("option:checked")).toHaveText("Prefixes");
});
