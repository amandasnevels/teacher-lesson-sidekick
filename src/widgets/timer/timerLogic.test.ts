import { describe, expect, it } from "vitest";
import { addTime, advance, initialSession, onRestore, pause, remainingMs, reset, start, type TimerConfig } from "./timerLogic";

const cfg = (o: Partial<TimerConfig> = {}): TimerConfig => ({
  durationSec: 300,
  soundOn: false,
  sound: "chime",
  visual: "ring",
  repeat: false,
  stations: { enabled: false, names: [] },
  ...o,
});

describe("timer state machine", () => {
  it("starts, pauses, resumes and resets using timestamps", () => {
    const t0 = 1_000_000;
    let s = start(initialSession(cfg()), t0);
    expect(s.status).toBe("running");
    expect(remainingMs(s, t0 + 60_000)).toBe(240_000);

    s = pause(s, t0 + 60_000);
    expect(s.status).toBe("paused");
    // Time passing while paused does not count.
    expect(remainingMs(s, t0 + 600_000)).toBe(240_000);

    s = start(s, t0 + 600_000); // resume
    expect(s.status).toBe("running");
    expect(remainingMs(s, t0 + 630_000)).toBe(210_000);

    s = reset(cfg());
    expect(s.status).toBe("idle");
    expect(remainingMs(s, t0 + 999_999)).toBe(300_000);
  });

  it("stays accurate even if the tab was throttled (no tick-counting)", () => {
    const s = start(initialSession(cfg({ durationSec: 60 })), 0);
    expect(remainingMs(s, 59_000)).toBe(1_000);
    expect(remainingMs(s, 120_000)).toBe(0);
  });

  it("finishes, repeats, or rotates stations", () => {
    const s = start(initialSession(cfg({ durationSec: 10 })), 0);
    expect(advance(s, cfg({ durationSec: 10 }), 5_000).event).toBeNull();
    const done = advance(s, cfg({ durationSec: 10 }), 10_000);
    expect(done.event).toBe("done");
    expect(done.session.status).toBe("done");

    const rep = advance(s, cfg({ durationSec: 10, repeat: true }), 10_000);
    expect(rep.event).toBe("repeat");
    expect(rep.session.round).toBe(2);
    expect(remainingMs(rep.session, 10_000)).toBe(10_000);

    const st = cfg({ durationSec: 10, stations: { enabled: true, names: ["A", "B"] } });
    const r1 = advance(s, st, 10_000);
    expect(r1.event).toBe("station");
    expect(r1.session.station).toBe(1);
    const r2 = advance(r1.session, st, 20_000);
    expect(r2.event).toBe("done");
  });

  it("does not restart a timer that expired while the app was closed", () => {
    const s = start(initialSession(cfg({ durationSec: 10, repeat: true })), 0);
    const restored = onRestore(s, 50_000)!;
    expect(restored.status).toBe("done");
    expect(remainingMs(restored, 50_000)).toBe(0);
    // A still-running timer is restored as running with the right remaining time.
    const running = onRestore(s, 4_000)!;
    expect(running.status).toBe("running");
    expect(remainingMs(running, 4_000)).toBe(6_000);
  });

  it("adds time", () => {
    const s = start(initialSession(cfg({ durationSec: 60 })), 0);
    expect(remainingMs(addTime(s, 60_000, 10_000), 10_000)).toBe(110_000);
  });
});
