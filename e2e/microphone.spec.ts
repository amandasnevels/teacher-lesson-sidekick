import { expect, test } from "@playwright/test";
import { openApp, widget } from "./helpers";

// Chromium's fake audio device produces a real tone, so the meter analyses actual input.
test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["microphone"],
});

test("live meter reads the microphone and releases tracks when stopped", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as unknown as { __streams: MediaStream[] }).__streams = [];
    navigator.mediaDevices.getUserMedia = async (c) => {
      const s = await orig(c);
      (window as unknown as { __streams: MediaStream[] }).__streams.push(s);
      return s;
    };
  });
  await openApp(page);
  const v = widget(page, "voice");
  await v.getByRole("button", { name: "Enable microphone" }).click();
  await expect(v.getByRole("button", { name: "Stop microphone" })).toBeVisible();
  await expect(v.getByText("Mic on · not recorded")).toBeVisible();
  await expect
    .poll(async () => Number(await v.getByRole("meter").getAttribute("aria-valuenow")), { timeout: 5000 })
    .toBeGreaterThan(0);
  await v.getByRole("button", { name: "Stop microphone" }).click();
  const states = await page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks().map((t) => t.readyState)));
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((s) => s === "ended")).toBe(true);
});
