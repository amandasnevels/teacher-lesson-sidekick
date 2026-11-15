import { expect, test } from "@playwright/test";
import { openApp, waitForSave, widget, widgetOrder } from "./helpers";

test.describe("narrow-first layout", () => {
  for (const width of [280, 320, 375, 768, 1280]) {
    test(`controls are usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await openApp(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      for (const name of ["Quick Find (Ctrl+K)", "Add widget", "Settings"]) {
        const box = await page.getByRole("button", { name, exact: true }).boundingBox();
        expect(box, name).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.height).toBeGreaterThanOrEqual(36);
      }
      await expect(page.getByRole("navigation", { name: "Quick Dock" })).toBeVisible();
      // The widget More menu opens fully inside the viewport (never clipped).
      await page.getByRole("button", { name: "More options for Timer" }).click();
      const menu = page.getByRole("menu", { name: "Timer options" });
      await expect(menu).toBeVisible();
      const mb = (await menu.boundingBox())!;
      expect(mb.x).toBeGreaterThanOrEqual(0);
      expect(mb.x + mb.width).toBeLessThanOrEqual(width);
      expect(mb.y + mb.height).toBeLessThanOrEqual(800);
      // No Up/Down items in the menu (movement is by drag handle).
      await expect(menu.getByRole("menuitem")).toHaveText(["Duplicate", "Save Favorite", "Change Color", "Lock", "Expand", "Remove", "More Settings"]);
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    });
  }
});

test("widget reordering persists after refresh", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  const before = await widgetOrder(page);
  const handle = page.locator(`[data-widget-id="${before[0]}"] [data-testid="drag-handle"]`);
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  const after = await widgetOrder(page);
  expect(after).not.toEqual(before);
  expect(after[1]).toBe(before[0]);
  await waitForSave(page);
  await page.reload();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  expect(await widgetOrder(page)).toEqual(after);
});

test("removed widgets can be undone and restored", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "More options for Sticky Note" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await expect(widget(page, "notes")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(widget(page, "notes")).toHaveCount(1);

  await page.getByRole("button", { name: "More options for Sticky Note" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await expect(widget(page, "notes")).toHaveCount(0);
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByRole("radio", { name: /Removed/ }).click();
  await page.getByRole("button", { name: "Restore Sticky Note" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).last().click();
  await expect(widget(page, "notes")).toHaveCount(1);
  await expect(widget(page, "notes").getByRole("textbox")).toHaveValue(/Welcome!/);
});

test("spinner lands on the segment under the pointer", async ({ page }) => {
  await openApp(page);
  const w = widget(page, "spinner");
  await w.getByTestId("spinner-wheel").scrollIntoViewIfNeeded();
  for (let i = 0; i < 2; i++) {
    await w.getByRole("button", { name: "Spin", exact: true }).click();
    await expect(w.getByTestId("spinner-result")).not.toHaveText(/Spinning|^\s*$/, { timeout: 10_000 });
    const result = (await w.getByTestId("spinner-result").textContent())!.trim();
    const check = await w.getByTestId("spinner-wheel").evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      const angle = (Math.atan2(m.b, m.a) * 180) / Math.PI;
      const n = el.querySelectorAll("[data-segment-index]").length;
      const local = (((-angle) % 360) + 360) % 360;
      const idx = Math.floor(local / (360 / n));
      const byMath = el.querySelector(`[data-segment-index="${idx}"]`)!.getAttribute("data-segment-label");
      // What is physically under the pointer (just below its tip)?
      el.scrollIntoView({ block: "center" });
      // Use the un-rotated container: a rotated square's bounding box is larger than the wheel.
      const r = el.parentElement!.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.14);
      return { byMath, byHit: hit?.getAttribute("data-segment-label") ?? hit?.outerHTML.slice(0, 80) };
    });
    expect(check.byMath).toBe(result);
    expect(check.byHit).toBe(result);
  }
});

test("dice result matches the visible face", async ({ page }) => {
  await openApp(page);
  const w = widget(page, "dice");
  await w.scrollIntoViewIfNeeded();
  for (let i = 0; i < 2; i++) {
    await w.getByRole("button", { name: "Roll", exact: true }).click();
    await expect(w.getByRole("button", { name: "Roll", exact: true })).toBeDisabled(); // no overlapping rolls
    await expect(w.getByTestId("dice-result")).toHaveText(/You rolled \d/, { timeout: 8000 });
    const text = (await w.getByTestId("dice-result").textContent())!;
    const rolled = text.match(/\d/)![0];
    const seen = await w.getByTestId("die-cube-0").evaluate((cube) => {
      const cm = new DOMMatrix(getComputedStyle(cube).transform);
      let best = "";
      let bestZ = -Infinity;
      cube.querySelectorAll<HTMLElement>("[data-face]").forEach((f) => {
        const fm = new DOMMatrix(getComputedStyle(f).transform);
        const n = cm.multiply(fm).transformPoint(new DOMPoint(0, 0, 1, 0));
        if (n.z > bestZ) {
          bestZ = n.z;
          best = f.dataset.face!;
        }
      });
      cube.scrollIntoView({ block: "center" });
      const r = cube.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("[data-face]") as HTMLElement | null;
      return { byMatrix: best, byHit: hit?.dataset.face };
    });
    expect(seen.byMatrix).toBe(rolled);
    expect(seen.byHit).toBe(rolled);
  }
});

test("coin result matches the visible side", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByRole("button", { name: "Add new Flip a Coin" }).click();
  const w = widget(page, "coin");
  await w.scrollIntoViewIfNeeded();
  for (let i = 0; i < 2; i++) {
    await w.getByRole("button", { name: /^🪙 Flip/ }).click();
    await expect(w.getByTestId("coin-result")).toHaveText(/heads|tails/i, { timeout: 8000 });
    const result = (await w.getByTestId("coin-result").textContent())!.trim().toLowerCase();
    const seen = await w.getByTestId("coin").evaluate((coin) => {
      const m = new DOMMatrix(getComputedStyle(coin).transform);
      const z = m.transformPoint(new DOMPoint(0, 0, 1, 0)).z;
      coin.scrollIntoView({ block: "center" });
      const r = coin.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("[data-coin-face]") as HTMLElement | null;
      return { byMatrix: z > 0 ? "heads" : "tails", byHit: hit?.dataset.coinFace };
    });
    expect(seen.byMatrix).toBe(result);
    expect(seen.byHit).toBe(result);
  }
});

test("timer runs, survives a refresh, and pauses", async ({ page }) => {
  await openApp(page);
  const t = widget(page, "timer");
  await t.getByRole("button", { name: "1m" }).click();
  await t.getByRole("button", { name: "Start timer" }).click();
  await expect(t.getByTestId("timer-status")).toHaveText("Running");
  await expect(t.getByTestId("timer-display")).toHaveText(/0:5\d/, { timeout: 3000 });
  await waitForSave(page);
  await page.reload();
  const t2 = widget(page, "timer");
  await expect(t2.getByTestId("timer-status")).toHaveText("Running");
  await expect(t2.getByTestId("timer-display")).toHaveText(/0:5\d/);
  await t2.getByRole("button", { name: "Pause timer" }).click();
  const paused = await t2.getByTestId("timer-display").textContent();
  await page.waitForTimeout(1500);
  await expect(t2.getByTestId("timer-display")).toHaveText(paused!);
});

test("Quick Find runs a deterministic command", async ({ page }) => {
  await openApp(page);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search widgets or type a command" }).fill("3 min timer");
  await expect(page.getByRole("listbox").getByRole("option").first()).toContainText("Start 3 minutes timer");
  await page.keyboard.press("Enter");
  const t = widget(page, "timer");
  await expect(t.getByTestId("timer-status")).toHaveText("Running");
  await expect(t.getByTestId("timer-display")).toHaveText(/^(3:00|2:5\d)$/);
});

test("custom spinner options persist after refresh", async ({ page }) => {
  await openApp(page);
  const w = widget(page, "spinner");
  await w.getByRole("button", { name: "Edit options" }).click();
  await w.getByRole("textbox", { name: "New option" }).fill("Dance break");
  await w.getByRole("button", { name: "Add", exact: true }).click();
  await expect(w.locator('[data-segment-label="Dance break"]')).toHaveCount(1);
  await waitForSave(page);
  await page.reload();
  await expect(widget(page, "spinner").locator('[data-segment-label="Dance break"]')).toHaveCount(1);
});

test("name picker uses a roster and never repeats within a round", async ({ page }) => {
  await openApp(page);
  const w = widget(page, "picker");
  await w.getByRole("button", { name: "Try demo class" }).click();
  await expect(page.getByTestId("class-select")).toContainText("Demo Class");
  const names = new Set<string>();
  for (let i = 0; i < 4; i++) {
    await w.getByRole("button", { name: "Pick", exact: true }).click();
    await expect(w.getByTestId("picked-name")).toHaveAttribute("data-final", "true", { timeout: 5000 });
    names.add((await w.getByTestId("picked-name").textContent())!);
  }
  expect(names.size).toBe(4);
  await expect(w.getByTestId("picker-progress")).toContainText("4 of 18");
});

test("Quick Dock routine performs its actions", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Cleanup", exact: true }).click();
  await expect(page.locator('[data-testid="widget-checklist"]').filter({ hasText: "Cleanup" })).toHaveCount(1);
  await expect(widget(page, "timer").getByTestId("timer-status")).toHaveText("Running");
  await expect(widget(page, "voice").getByTestId("voice-expectation")).toContainText("Table");
});

test.describe("microphone", () => {
  test("denied permission is handled gracefully", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    });
    await openApp(page);
    const v = widget(page, "voice");
    await v.getByRole("button", { name: "Enable microphone" }).click();
    await expect(v.getByTestId("mic-error")).toContainText("blocked");
    await expect(v.getByRole("button", { name: "Enable microphone" })).toBeEnabled();
  });
});

test("widgets resize by dragging a corner; size persists and narrow windows don't overwrite it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  await page.getByRole("button", { name: "Dismiss tip" }).click();
  const card = page.locator("[data-widget-id]").first();
  const before = (await card.boundingBox())!;
  expect(await card.getAttribute("data-span")).toBe("2");

  const grip = card.getByTestId("resize-right");
  await grip.scrollIntoViewIfNeeded();
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + 260, g.y + 120, { steps: 10 });
  await expect(page.getByTestId("resize-badge")).toContainText("3 cols");
  await page.mouse.up();
  await expect(card).toHaveAttribute("data-span", "3");
  const after = (await card.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width + 200);
  expect(after.height).toBeGreaterThan(before.height + 80);

  // Bottom-left corner shrinks the width again.
  await card.getByTestId("resize-left").scrollIntoViewIfNeeded();
  const gl = (await card.getByTestId("resize-left").boundingBox())!;
  await page.mouse.move(gl.x + gl.width / 2, gl.y + gl.height / 2);
  await page.mouse.down();
  await page.mouse.move(gl.x + 260, gl.y + 2, { steps: 10 });
  await page.mouse.up();
  await expect(card).toHaveAttribute("data-span", "2");
  const resized = (await card.boundingBox())!;

  await waitForSave(page);
  await page.reload();
  const card2 = page.locator("[data-widget-id]").first();
  await expect(card2).toHaveAttribute("data-span", "2");
  expect(Math.abs((await card2.boundingBox())!.height - resized.height)).toBeLessThan(2);

  // Narrow window: everything stacks, but the saved preference returns on a wide window.
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(card2).toHaveAttribute("data-span", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(card2).toHaveAttribute("data-span", "2");
});

test("resize grips work from the keyboard and are hidden on locked widgets", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  const card = page.locator("[data-widget-id]").first();
  await card.getByTestId("resize-right").focus();
  await page.keyboard.press("ArrowRight");
  await expect(card).toHaveAttribute("data-span", "3");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(card).toHaveAttribute("data-span", "1");
  await page.getByRole("button", { name: "More options for Timer" }).click();
  await page.getByRole("menuitem", { name: "Lock" }).click();
  await expect(card.getByTestId("resize-right")).toHaveCount(0);
});

test("side-by-side guide opens Sidekick in its own narrow window and pauses the old one", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  const tip = page.getByTestId("side-by-side-tip");
  await expect(tip).toBeVisible();
  await tip.getByRole("button", { name: "Show me how" }).click();
  await expect(tip).toContainText("Drag this browser tab out");

  const [popup] = await Promise.all([page.waitForEvent("popup"), tip.getByRole("button", { name: "Open in its own window" }).click()]);
  await expect(popup.getByTestId("widget-grid")).toBeVisible();
  expect(await popup.evaluate(() => window.name)).toBe("sidekick-popout");
  await expect(popup.getByTestId("side-by-side-tip")).toHaveCount(0); // no tip inside the pop-out

  // The original window pauses so the two can't overwrite each other.
  await expect(page.getByRole("alertdialog")).toContainText("open in another window");

  // Changes made in the pop-out are saved.
  await popup.getByRole("button", { name: "More options for Sticky Note" }).click();
  await popup.getByRole("menuitem", { name: "Remove" }).click();
  await popup.waitForTimeout(700);
  await popup.close();
  await page.getByRole("button", { name: "Use Sidekick here instead" }).click();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  await expect(page.locator('[data-testid="widget-notes"]')).toHaveCount(0);
});

test("side-by-side tip can be dismissed and stays dismissed", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  await page.getByRole("button", { name: "Dismiss tip" }).click();
  await expect(page.getByTestId("side-by-side-tip")).toHaveCount(0);
  await waitForSave(page);
  await page.reload();
  await expect(page.getByTestId("widget-grid")).toBeVisible();
  await expect(page.getByTestId("side-by-side-tip")).toHaveCount(0);
  // Still available in Settings.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Open in its own window" })).toBeVisible();
});

for (const vp of [{ width: 1366, height: 600 }, { width: 1024, height: 500 }, { width: 375, height: 560 }]) {
  test(`pop-ups fit the screen, scroll, and close at ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await openApp(page);
    for (const open of ["Add widget", "Settings"]) {
      await page.getByRole("button", { name: open, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
      // Both exits are on screen: the ✕ in the title bar and the Close button at the bottom.
      for (const btn of [dialog.getByRole("button", { name: "Close", exact: true }).first(), dialog.getByRole("button", { name: "Close", exact: true }).last()]) {
        const b = (await btn.boundingBox())!;
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
      }
      // The content area scrolls to its end.
      const scrolled = await dialog.evaluate((d) => {
        const area = Array.from(d.querySelectorAll<HTMLElement>("div")).find((el) => getComputedStyle(el).overflowY === "auto")!;
        area.scrollTop = area.scrollHeight;
        return { canScroll: area.scrollHeight > area.clientHeight, atEnd: Math.abs(area.scrollTop + area.clientHeight - area.scrollHeight) < 2 };
      });
      if (open === "Add widget") expect(scrolled.canScroll).toBe(true);
      expect(scrolled.atEnd).toBe(true);
      await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
      await expect(dialog).toBeHidden();
    }
  });
}

test("hall pass: quick check-out and check-in, logged with times", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  await widget(page, "picker").getByRole("button", { name: "Try demo class" }).click();
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  await page.getByRole("button", { name: "Add new Hall Pass", exact: true }).click();
  const w = widget(page, "hallpass");
  await w.scrollIntoViewIfNeeded();
  await w.getByRole("button", { name: /Check out/ }).click();
  const out = page.getByRole("dialog", { name: "Check out" });
  const box = (await out.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await out.getByRole("option", { name: "Cam Delgado" }).click();
  await out.getByRole("button", { name: /Restroom/ }).click();
  await expect(w.getByTestId("hall-count")).toHaveText("1");
  await expect(w.getByTestId("hall-names")).toContainText("Cam Delgado");
  await w.getByRole("button", { name: /^Check in$/ }).click();
  await page.getByRole("button", { name: "Check in Cam Delgado" }).click();
  await expect(w.getByTestId("hall-count")).toHaveText("0");
  await w.getByRole("button", { name: /Out-of-room log/ }).click();
  await expect(page.getByTestId("hall-log")).toContainText("Cam Delgado");
  await expect(page.getByTestId("hall-log")).toContainText("Restroom");
  // Survives a refresh.
  await page.keyboard.press("Escape");
  await waitForSave(page);
  await page.reload();
  await widget(page, "hallpass").getByRole("button", { name: /Out-of-room log/ }).click();
  await expect(page.getByTestId("hall-log")).toContainText("Cam Delgado");
});

test("Roster manager button opens the roster right away", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  const picker = widget(page, "picker");
  // No class yet: the pop-up offers to create one.
  await picker.getByRole("button", { name: "Roster manager" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "New class name" }).fill("Period 3");
  await dialog.getByRole("button", { name: "Create" }).click();
  // New, empty class: opens on the Add tab.
  await dialog.getByRole("textbox", { name: "Paste student names" }).fill("Ana\nBen\nCy");
  await dialog.getByRole("button", { name: "Add pasted names" }).click();
  await expect(dialog.getByRole("status")).toContainText("Added 3");
  await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
  await expect(picker.getByRole("button", { name: "Pick", exact: true })).toBeEnabled();
  await expect(picker.getByTestId("picker-progress")).toContainText("0 of 3");
  // With a class that has no students, it goes straight to Add.
  await page.getByTestId("class-select").selectOption("__new");
  await page.getByRole("dialog").getByRole("textbox").fill("Period 4");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await picker.getByRole("button", { name: "Roster manager" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("textbox", { name: "Paste student names" })).toBeVisible();
});
