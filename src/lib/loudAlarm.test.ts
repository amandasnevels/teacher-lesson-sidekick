import { describe, expect, it } from "vitest";
import { LoudAlarm } from "./loudAlarm";

describe("too-loud alarm", () => {
  it("fires only after staying red for the delay", () => {
    const a = new LoudAlarm({ delayMs: 2000, cooldownMs: 10000 });
    expect(a.update(true, 0)).toBe(false);
    expect(a.update(true, 1900)).toBe(false);
    expect(a.update(true, 2000)).toBe(true);
  });

  it("a short burst (cough, dropped book) does not fire", () => {
    const a = new LoudAlarm({ delayMs: 2000, cooldownMs: 10000 });
    a.update(true, 0);
    a.update(true, 1500);
    a.update(false, 1600); // quiet again resets the clock
    expect(a.update(true, 2100)).toBe(false);
    expect(a.update(true, 3500)).toBe(false);
    expect(a.update(true, 4100)).toBe(true);
  });

  it("respects the cooldown and ignores the mic while its own alert plays", () => {
    const a = new LoudAlarm({ delayMs: 1000, cooldownMs: 10000, ignoreMs: 2500 });
    a.update(true, 0);
    expect(a.update(true, 1000)).toBe(true);
    // Loud readings during the alert itself are ignored and the cooldown holds.
    for (let t = 1100; t < 11000; t += 100) expect(a.update(true, t)).toBe(false);
    expect(a.update(true, 11000)).toBe(true);
  });

  it("reset clears pending and cooldown state", () => {
    const a = new LoudAlarm({ delayMs: 0, cooldownMs: 60000, ignoreMs: 0 });
    expect(a.update(true, 0)).toBe(true);
    expect(a.update(true, 10)).toBe(false);
    a.reset();
    expect(a.update(true, 20)).toBe(true);
  });
});
