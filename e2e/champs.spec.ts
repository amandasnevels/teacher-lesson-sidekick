import { expect, test } from "@playwright/test";
import { openApp, waitForSave, widget } from "./helpers";

test("CHAMPS: add at 320px, switch to Stations, edit two presets, reload, and expand", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openApp(page);

  // Add from Widget Library → Management.
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  const library = page.getByRole("dialog", { name: "Widget Library" });
  await library.getByRole("button", { name: "Management", exact: true }).click();
  await library.getByRole("button", { name: "Add new CHAMPS", exact: true }).click();
  const w = widget(page, "champs");
  await w.scrollIntoViewIfNeeded();
  const presets = w.getByRole("combobox", { name: "CHAMPS activity" });
  await expect(presets.getByRole("option")).toHaveCount(8);
  await expect(w.locator("li[data-testid^=champs-row-]")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // Choosing from the drop-down switches the six picture tiles.
  await presets.selectOption("stations");
  await expect(presets).toHaveValue("stations");
  await expect(w.getByTestId("champs-row-C-caption")).toHaveText("Talk with your station");
  await expect(w.getByTestId("champs-active-card")).toContainText("Stations");
  // The card pictures load.
  await expect.poll(() => w.locator("img").evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).naturalWidth > 0).length)).toBe(7);
  await expect(w.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w.getByTestId("champs-row-H")).toContainText("Check the directions, then ask your group.");

  // More Settings: edit Stations Help, then Partner Work separately.
  await page.getByRole("button", { name: "More options for CHAMPS" }).click();
  await page.getByRole("menuitem", { name: "More Settings" }).click();
  const settings = page.getByRole("dialog", { name: /CHAMPS settings/ });
  await expect(settings.getByRole("combobox", { name: "Preset to edit" })).toHaveValue("stations");
  await settings.getByRole("textbox", { name: "Stations Help caption" }).fill("Ask 3, then me");
  await settings.getByRole("textbox", { name: "Stations Help details" }).fill("Ask three classmates, then the teacher.");
  await settings.getByRole("combobox", { name: "Preset to edit" }).selectOption("partner");
  await settings.getByRole("textbox", { name: "Partner Work Movement caption" }).fill("Knee to knee");
  await settings.getByRole("textbox", { name: "Partner Work Movement details" }).fill("Sit knee to knee with your partner.");
  await settings.getByRole("button", { name: "Done" }).click();

  // The displayed activity stayed on Stations and shows the edit.
  await expect(w.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w.getByTestId("champs-row-H-caption")).toHaveText("Ask 3, then me");
  await expect(w.getByTestId("champs-row-H")).toHaveAttribute("title", "Help: Ask three classmates, then the teacher.");

  // Reload: both edits and the active preset survive.
  await waitForSave(page);
  await page.reload();
  const w2 = widget(page, "champs");
  await expect(w2.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w2.getByTestId("champs-row-H-caption")).toHaveText("Ask 3, then me");
  await expect(w2.getByTestId("champs-row-H")).toContainText("Ask three classmates, then the teacher.");
  await w2.getByRole("combobox", { name: "CHAMPS activity" }).selectOption("partner");
  await expect(w2.getByTestId("champs-row-M-caption")).toHaveText("Knee to knee");
  await expect(w2.getByTestId("champs-row-M")).toContainText("Sit knee to knee with your partner.");
  await w2.getByRole("combobox", { name: "CHAMPS activity" }).selectOption("stations");

  // Expand: projection view of the active preset with the saved wording, no teacher controls.
  await page.getByRole("button", { name: "More options for CHAMPS" }).click();
  await page.getByRole("menuitem", { name: "Expand" }).click();
  const expanded = page.getByTestId("champs-expanded");
  await expect(expanded.getByTestId("champs-active")).toHaveText("Stations");
  await expect(expanded.getByTestId("champs-row-H-caption")).toHaveText("Ask 3, then me");
  await expect(expanded.getByTestId("champs-row-H")).toContainText("Ask three classmates, then the teacher.");
  await expect(expanded.getByTestId("champs-row-C")).toContainText("Level 2. Talk with your station group.");
  await expect(expanded.getByRole("combobox")).toHaveCount(0);
  await expect(expanded.getByText("Ask three classmates, then the teacher.")).toBeVisible();
  await expect(expanded.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Return to workspace" }).click();
  await expect(expanded).toHaveCount(0);
});
