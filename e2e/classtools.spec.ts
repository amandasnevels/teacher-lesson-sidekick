import { expect, test, type Page } from "@playwright/test";
import { openApp, waitForSave } from "./helpers";

async function setup(page: Page, widgets: string[]) {
  await page.setViewportSize({ width: 1200, height: 950 });
  await openApp(page);
  await page.getByRole("button", { name: "Dismiss tip" }).click();
  for (const name of ["Period 1", "Period 2"]) {
    await page.getByTestId("class-select").selectOption("__new");
    await page.getByRole("dialog").getByRole("textbox").fill(name);
    await page.getByRole("button", { name: "Create", exact: true }).click();
  }
  // Fictional demo roster for Period 2 (the active class).
  const gate = page.locator('[data-testid="widget-picker"]');
  await gate.getByRole("textbox").first().fill("Avery Brook\nBennie Cruz\nCam Delgado");
  await gate.getByRole("button", { name: /Add|Save/ }).first().click();
  await page.getByTestId("workspace-select").selectOption("__new");
  const dlg = page.getByTestId("new-workspace-dialog");
  await dlg.getByRole("radio", { name: "Start blank" }).click();
  await dlg.getByRole("textbox").fill("Tools");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  for (const n of widgets) {
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
    await page.getByRole("button", { name: `Add new ${n}`, exact: true }).click();
  }
}

test("mastery check: objective, correct = +1 point and sticker, incorrect quietly marked for reteach, absent", async ({ page }) => {
  await setup(page, ["Name Picker", "Point Tracker"]);
  const pk = page.locator('[data-testid="widget-picker"]').last();
  await pk.getByRole("checkbox", { name: /Correct \/ incorrect/ }).check();
  await pk.getByRole("textbox", { name: "Objective" }).fill("I can add fractions");
  await pk.getByRole("button", { name: "Start" }).click();
  const call = async () => {
    await pk.getByRole("button", { name: "Pick", exact: true }).click();
    await expect(pk.locator('[data-testid="picked-name"][data-final="true"]')).toBeVisible();
    return (await pk.getByTestId("picked-name").textContent())!.trim();
  };
  const first = await call();
  await pk.getByRole("button", { name: `Correct: ${first}`, exact: true }).click();
  await expect(pk.getByTestId("mastery-celebrate")).toContainText(first);
  await expect(pk.getByTestId("mastery-celebrate")).toContainText("+1 point");
  await expect(pk.getByTestId("mastery-celebrate")).toBeHidden({ timeout: 5000 });
  const second = await call();
  expect(second).not.toBe(first);
  await pk.getByRole("button", { name: `Incorrect: ${second}`, exact: true }).click();
  await expect(pk.getByText(/Tap Pick/)).toBeVisible(); // nothing announced to the class
  const third = await call();
  expect([first, second]).not.toContain(third); // students not yet called come first
  await pk.getByRole("button", { name: `Absent: ${third}`, exact: true }).click();
  // Then the reteach student gets another turn.
  expect(await call()).toBe(second);
  await pk.getByRole("button", { name: `Correct: ${second}`, exact: true }).click();

  await pk.getByRole("button", { name: "Mastery tracker" }).click();
  const tr = page.getByTestId("mastery-tracker");
  await expect(tr.getByTestId(`mastery-row-${first}`)).toContainText("Mastered");
  await expect(tr.getByTestId(`mastery-row-${second}`)).toContainText("after reteach");
  await expect(tr.getByTestId(`mastery-row-${third}`)).toContainText("Absent");
  await page.keyboard.press("Escape");
  // Correct answers added student points.
  const pts = page.locator('[data-testid="widget-points"]');
  await pts.getByRole("radio", { name: "Students", exact: true }).click();
  await expect(pts.getByTestId(`student-points-${first}`)).toHaveText("1");
  await expect(pts.getByTestId(`student-points-${second}`)).toHaveText("1");
});

test("points: visuals, a secret picture per class, and all classes at once", async ({ page }) => {
  await setup(page, ["Point Tracker", "Dice", "Schedule"]);
  const pts = page.locator('[data-testid="widget-points"]');
  for (let i = 0; i < 6; i++) await pts.getByRole("button", { name: "Add 1 class points" }).click();
  const show = pts.getByRole("combobox", { name: "Show class points as" });
  await show.selectOption("jar");
  await expect(pts.getByTestId("points-jar")).toContainText("14 more stars");
  await show.selectOption("collector");
  await expect(pts.getByTestId("points-collector")).toContainText("1 critter collected");
  await show.selectOption("monster");
  await expect(pts.getByTestId("points-monster")).toBeVisible();
  await show.selectOption("reveal");
  await expect(pts.getByTestId("reveal-count")).toHaveText("6 of 20 pieces revealed");
  await pts.getByRole("button", { name: "Subtract 1 class points" }).click();
  await expect(pts.getByTestId("reveal-count")).toHaveText("5 of 20 pieces revealed"); // losing a point covers a piece
  await pts.getByRole("button", { name: /Change Period 2/ }).click();
  await pts.getByRole("button", { name: "Under the sea" }).click();
  await expect(pts.getByRole("button", { name: "Under the sea" })).toHaveAttribute("aria-pressed", "true");

  await pts.getByRole("button", { name: "All classes" }).click();
  const all = pts.getByTestId("points-all-classes");
  await expect(all.getByTestId("all-points-Period 2")).toHaveText("5");
  await expect(all.getByTestId("all-points-Period 1")).toHaveText("0");
  await all.getByRole("button", { name: "Add 1 to Period 1" }).click();
  await expect(all.getByTestId("all-points-Period 1")).toHaveText("1");

  // Dice: Roll sits beside the dice.
  const dice = page.locator('[data-testid="widget-dice"]');
  const card = (await dice.boundingBox())!;
  expect(card.height).toBeLessThan(260);

  // Schedule: pick the class for a period right next to its time; it's saved.
  const sch = page.locator('[data-testid="widget-schedule"]');
  await sch.getByRole("combobox", { name: "Class for Reading" }).selectOption({ label: "Period 1" });
  await waitForSave(page);
  await page.reload();
  await expect(page.locator('[data-testid="widget-schedule"]').getByRole("combobox", { name: "Class for Reading" }).locator("option:checked")).toHaveText("Period 1");
});
