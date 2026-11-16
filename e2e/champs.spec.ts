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
  const presets = w.getByRole("radiogroup", { name: "CHAMPS activity" });
  await expect(presets.getByRole("radio")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // One click switches the six expectations.
  await presets.getByRole("radio", { name: /Stations/ }).click();
  await expect(presets.getByRole("radio", { name: /Stations/ })).toHaveAttribute("aria-checked", "true");
  await expect(w.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w.getByTestId("champs-row-H")).toContainText("Check the directions, then ask your group.");

  // More Settings: edit Stations Help, then Partner Work separately.
  await page.getByRole("button", { name: "More options for CHAMPS" }).click();
  await page.getByRole("menuitem", { name: "More Settings" }).click();
  const settings = page.getByRole("dialog", { name: /CHAMPS settings/ });
  await expect(settings.getByRole("combobox", { name: "Preset to edit" })).toHaveValue("stations");
  await settings.getByRole("textbox", { name: "Stations Help" }).fill("Ask three classmates, then the teacher.");
  await settings.getByRole("combobox", { name: "Preset to edit" }).selectOption("partner");
  await settings.getByRole("textbox", { name: "Partner Work Movement" }).fill("Sit knee to knee with your partner.");
  await settings.getByRole("button", { name: "Done" }).click();

  // The displayed activity stayed on Stations and shows the edit.
  await expect(w.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w.getByTestId("champs-row-H")).toHaveText(/Ask three classmates, then the teacher\./);

  // Reload: both edits and the active preset survive.
  await waitForSave(page);
  await page.reload();
  const w2 = widget(page, "champs");
  await expect(w2.getByTestId("champs-active")).toHaveText("Stations");
  await expect(w2.getByTestId("champs-row-H")).toContainText("Ask three classmates, then the teacher.");
  await w2.getByRole("radiogroup", { name: "CHAMPS activity" }).getByRole("radio", { name: /Partner Work/ }).click();
  await expect(w2.getByTestId("champs-row-M")).toContainText("Sit knee to knee with your partner.");
  await w2.getByRole("radiogroup", { name: "CHAMPS activity" }).getByRole("radio", { name: /Stations/ }).click();

  // Expand: projection view of the active preset with the saved wording, no teacher controls.
  await page.getByRole("button", { name: "More options for CHAMPS" }).click();
  await page.getByRole("menuitem", { name: "Expand" }).click();
  const expanded = page.getByTestId("champs-expanded");
  await expect(expanded.getByTestId("champs-active")).toHaveText("Stations");
  await expect(expanded.getByTestId("champs-row-H")).toContainText("Ask three classmates, then the teacher.");
  await expect(expanded.getByTestId("champs-row-C")).toContainText("Level 2. Talk with your station group.");
  await expect(expanded.getByRole("radiogroup")).toHaveCount(0);
  await expect(expanded.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Return to workspace" }).click();
  await expect(expanded).toHaveCount(0);
});
