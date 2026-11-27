import { expect, test } from "@playwright/test";
import { openApp, waitForSave } from "./helpers";

async function newClass(page: import("@playwright/test").Page, name: string) {
  await page.getByTestId("class-select").selectOption("__new");
  await page.getByRole("dialog").getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("class-switch-dialog")).toHaveCount(0); // a brand-new class keeps the workspace
}

test("Active Class + Teaching Workspace: prompt, templates, required CHAMPS, paused timers, class customization", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openApp(page);
  await page.getByRole("button", { name: "Dismiss tip" }).click();
  await expect(page.getByText("Active Class", { exact: true })).toBeVisible();
  await expect(page.getByText("Teaching Workspace", { exact: true })).toBeVisible();

  await newClass(page, "Period 1");
  await newClass(page, "Period 2");

  // Start a timer in My Classroom, then make a Daily Organization workspace from a template.
  await page.getByRole("button", { name: "Start timer" }).first().click();
  await page.getByTestId("workspace-select").selectOption("__new");
  await page.getByTestId("new-workspace-dialog").getByRole("radio", { name: /Daily Organization/ }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  for (const t of ["champs", "voice", "clock", "schedule", "reminders", "hallpass", "checklist"])
    await expect(page.locator(`[data-testid="widget-${t}"]`)).toHaveCount(1);
  // Required CHAMPS can't be removed.
  await page.getByRole("button", { name: "More options for Expectations" }).click();
  await expect(page.getByRole("menuitem", { name: /Remove/ })).toBeDisabled();
  await page.keyboard.press("Escape");

  // Switching class asks which workspace; Period 1's last-used is My Classroom.
  await page.getByTestId("class-select").selectOption({ label: "Period 1 (0)" });
  const dlg = page.getByTestId("class-switch-dialog");
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("button", { name: /Keep Current Workspace \(Daily Organization\)/ })).toBeVisible();
  await dlg.getByRole("button", { name: /Last-Used Workspace \(My Classroom\)/ }).click();
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("My Classroom");
  // The timer was paused when we left, and stays paused when we come back.
  await expect(page.getByTestId("timer-status").first()).toHaveText("Paused");

  // Customize My Classroom for Period 1 only.
  await page.getByTestId("workspace-select").selectOption("__customize");
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("My Classroom (Period 1 version)");
  await page.getByRole("button", { name: "More options for Dice" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await expect(page.locator('[data-testid="widget-dice"]')).toHaveCount(0);
  await waitForSave(page);
  await page.reload();
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("My Classroom (Period 1 version)");
  await expect(page.locator('[data-testid="widget-dice"]')).toHaveCount(0);

  // Period 2 still sees the shared workspace (with the dice).
  const p2 = await page.getByTestId("class-select").locator("option", { hasText: "Period 2" }).getAttribute("value");
  await page.getByTestId("class-select").selectOption(p2!);
  await page.getByTestId("class-switch-dialog").getByRole("button", { name: /Keep Current Workspace/ }).click();
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("My Classroom");
  await expect(page.locator('[data-testid="widget-dice"]')).toHaveCount(1);
  // Only shared workspaces are listed.
  await expect(page.getByTestId("workspace-select").locator("option", { hasText: "Period 1 version" })).toHaveCount(0);
});
