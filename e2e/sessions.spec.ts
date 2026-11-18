import { expect, test } from "@playwright/test";

const chooser = (page: import("@playwright/test").Page) => page.getByTestId("workspace-chooser");

test("a new visit shows the branded chooser with all eight presets, at desktop and sidebar widths", async ({ page }) => {
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(chooser(page)).toHaveAttribute("data-mode", "welcome");
    await expect(page.getByRole("heading", { name: "Welcome to Teacher Sidekick!" })).toBeVisible();
    await expect(page.getByText("Your classroom tools, ready when you are. Choose a teaching workspace to get started.")).toBeVisible();
    await expect(page.getByAltText("Teacher Sidekick by NevelLabs")).toBeVisible();
    for (const name of ["Bryan ISD Workspace", "Whole Group", "Stations & Centers", "Testing", "Small Group", "Classroom Management", "Daily Organization", "Transition", "Custom Workspace"])
      await expect(page.getByRole("button", { name: `Open ${name}`, exact: true })).toHaveText(`Open ${name}`);
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    // Download for Mac always points at the newest signed release.
    await expect(page.getByTestId("mac-download-apple-silicon")).toHaveAttribute("href", /releases\/latest\/download\/Teacher-Sidekick-Mac-Apple-Silicon\.zip$/);
    await expect(page.getByTestId("mac-download-intel")).toHaveAttribute("href", /releases\/latest\/download\/Teacher-Sidekick-Mac-Intel\.zip$/);
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    // Nothing personal and no class or workspace dropdowns before a choice.
    await expect(page.getByTestId("class-select")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
});

test("choose a preset → session kept across refreshes in this tab; a new tab starts fresh; return to the chooser keeps the session", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  // Accounts aren't connected yet: the buttons explain that and collect nothing.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("account-coming-soon")).toContainText("coming soon");
  await expect(page.getByTestId("account-coming-soon").locator("input")).toHaveCount(0);
  await page.getByRole("button", { name: /Got it/ }).click();
  await page.getByRole("checkbox", { name: /quick 4-step tour/ }).check();
  await page.getByRole("button", { name: "Open Bryan ISD Workspace", exact: true }).click();
  // Optional walkthrough.
  await expect(page.getByTestId("walkthrough")).toContainText("Active Class");
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  const order = await page.locator("[data-widget-id] [data-testid^=widget-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect([...order].sort()).toEqual(["widget-champs", "widget-checklist", "widget-clock", "widget-hallpass", "widget-ican", "widget-iwill", "widget-picker", "widget-reward", "widget-timer", "widget-voice"].sort());
  await expect(page.getByRole("heading", { name: "Check Out" })).toBeVisible();

  // Add a demo class.
  await page.getByTestId("class-select").selectOption("__new");
  await page.getByRole("dialog").getByRole("textbox").fill("Period 3");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForTimeout(700);

  // Refresh: the session continues.
  await page.reload();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  await expect(page.getByTestId("class-select").locator("option:checked")).toHaveText(/Period 3/);

  // Return to the main menu (presets) and open another preset: the class is kept, no onboarding.
  await page.getByTestId("main-menu").click();
  await expect(chooser(page)).toHaveAttribute("data-mode", "switch");
  await page.getByRole("button", { name: "Open Testing", exact: true }).click();
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("Testing");
  await expect(page.getByTestId("class-select").locator("option:checked")).toHaveText(/Period 3/);
  await expect(page.locator('[data-testid="widget-status"]')).toContainText("Testing");
  // Choosing it again opens the same workspace instead of a copy.
  await page.getByRole("button", { name: /open the workspace chooser/ }).click();
  await page.getByRole("button", { name: "Open Bryan ISD Workspace", exact: true }).click();
  // All eight presets are listed; picking one that isn't open yet creates it once.
  const options = page.getByTestId("workspace-select").locator("option");
  await expect(options).toHaveText([
    "Bryan ISD Workspace", "Whole Group", "Stations & Centers", "Testing", "Small Group", "Classroom Management", "Daily Organization", "Transition", "Custom Workspace",
    "✏️ Customize for This Class", "＋ New workspace…", "Manage workspaces…",
  ]);
  await page.getByTestId("workspace-select").selectOption({ label: "Small Group" });
  await expect(page.getByTestId("workspace-select").locator("option:checked")).toHaveText("Small Group");
  await expect(page.locator('[data-testid="widget-participation"]')).toHaveCount(1);
  await expect(options).toHaveCount(12);

  // A genuinely new visit (new tab) starts fresh: no class, no workspace.
  const fresh = await context.newPage();
  await fresh.goto("/");
  await expect(chooser(fresh)).toHaveAttribute("data-mode", "welcome");
  await expect(fresh.getByText("Period 3")).toHaveCount(0);
  // ...and the two tabs don't pause each other.
  await expect(page.getByText("Sidekick is open in another window")).toHaveCount(0);
});

test("ending the session starts fresh; Whole Group has no Voice Level but it can be added", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Whole Group", exact: true }).click();
  await expect(page.locator('[data-testid="widget-voice"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  await page.getByRole("button", { name: "Add new Voice Level", exact: true }).click();
  await expect(page.locator('[data-testid="widget-voice"]')).toHaveCount(1);
  await page.getByRole("button", { name: /open the workspace chooser/ }).click();
  await page.getByRole("button", { name: /End session/ }).click();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await expect(chooser(page)).toHaveAttribute("data-mode", "welcome");
  await page.reload();
  await expect(chooser(page)).toHaveAttribute("data-mode", "welcome");
});
