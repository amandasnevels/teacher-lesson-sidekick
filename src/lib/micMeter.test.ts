import { afterEach, describe, expect, it, vi } from "vitest";
import { MicMeter, describeMicError, rmsToLevel } from "./micMeter";

function fakeAudio() {
  const analyser = { fftSize: 2048, getFloatTimeDomainData: vi.fn((b: Float32Array) => b.fill(0.05)) };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const ctx = { createMediaStreamSource: vi.fn(() => source), createAnalyser: vi.fn(() => analyser), close: vi.fn(() => Promise.resolve()), state: "running" };
  (window as unknown as { AudioContext: unknown }).AudioContext = vi.fn(() => ctx);
  return { ctx, source, analyser };
}

function mockGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn(impl) }, configurable: true });
}

afterEach(() => vi.restoreAllMocks());

describe("microphone meter", () => {
  it("reports denied permission gracefully", async () => {
    mockGetUserMedia(() => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })));
    const m = new MicMeter();
    const states: string[] = [];
    let err: string | undefined;
    m.onState = (s, e) => {
      states.push(s);
      if (e) err = e.code;
    };
    await m.start();
    expect(states).toEqual(["starting", "error"]);
    expect(err).toBe("denied");
  });

  it("reports missing devices and unsupported browsers", async () => {
    expect(describeMicError({ name: "NotFoundError" }).code).toBe("no-device");
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    const m = new MicMeter();
    let code = "";
    m.onState = (_s, e) => e && (code = e.code);
    await m.start();
    expect(code).toBe("unsupported");
  });

  it("stops every microphone track and closes audio when stopped", async () => {
    const { ctx, source } = fakeAudio();
    const track = { stop: vi.fn() };
    mockGetUserMedia(() => Promise.resolve({ getTracks: () => [track] } as unknown as MediaStream));
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const m = new MicMeter();
    const levels: number[] = [];
    m.onLevel = (l) => levels.push(l);
    await m.start();
    expect(m.active).toBe(true);
    expect(levels[0]).toBeGreaterThan(0); // real analysis of the (fake) signal, not a made-up number
    // The analyser is never connected to speakers and nothing is recorded.
    expect(source.connect).toHaveBeenCalledTimes(1);
    m.stop();
    expect(track.stop).toHaveBeenCalled();
    expect(ctx.close).toHaveBeenCalled();
    expect(m.active).toBe(false);
  });

  it("maps loudness to a relative 0-100 scale", () => {
    expect(rmsToLevel(0)).toBe(0);
    expect(rmsToLevel(1)).toBe(100);
    expect(rmsToLevel(0.01, 1)).toBeLessThan(rmsToLevel(0.01, 3));
  });
});
