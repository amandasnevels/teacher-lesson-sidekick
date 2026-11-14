import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { add, resetStore, S } from "@/test-utils";
import Voice from "./Voice";

const audio = vi.hoisted(() => ({ playSound: vi.fn(() => true) }));
vi.mock("@/lib/audio", async (orig) => ({ ...(await orig<typeof import("@/lib/audio")>()), playSound: audio.playSound }));

beforeEach(() => resetStore());

describe("Voice Level widget", () => {
  it("shows a helpful message when microphone permission is denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn(() => Promise.reject(Object.assign(new Error("x"), { name: "NotAllowedError" }))) },
      configurable: true,
    });
    const id = add("voice");
    render(<Voice.Body id={id} view="normal" size="M" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable microphone/ }));
    });
    expect(await screen.findByTestId("mic-error")).toHaveTextContent(/blocked/i);
    expect(screen.getByRole("button", { name: /Enable microphone/ })).toBeEnabled();
  });

  it("releases the microphone when the widget unmounts", async () => {
    vi.useFakeTimers();
    const track = { stop: vi.fn() };
    const ctx = { createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }), createAnalyser: () => ({ fftSize: 2048, getFloatTimeDomainData: vi.fn() }), close: vi.fn(() => Promise.resolve()), state: "running" };
    (window as unknown as { AudioContext: unknown }).AudioContext = vi.fn(() => ctx);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [track] })) }, configurable: true });
    const id = add("voice");
    const { unmount } = render(<Voice.Body id={id} view="normal" size="M" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable microphone/ }));
    });
    expect(screen.getByRole("button", { name: /Stop microphone/ })).toBeInTheDocument();
    expect(screen.getByText(/not recorded/)).toBeInTheDocument();
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(track.stop).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("selecting an expectation updates the display", () => {
    const id = add("voice");
    render(<Voice.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("radio", { name: /Presentation/ }));
    expect(screen.getByTestId("voice-expectation")).toHaveTextContent("Presentation");
  });
});

describe("too-loud sound alert", () => {
  function loudMic(amplitude: () => number) {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const ctx = {
      createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
      createAnalyser: () => ({ fftSize: 2048, getFloatTimeDomainData: (b: Float32Array) => b.fill(amplitude()) }),
      close: vi.fn(() => Promise.resolve()),
      state: "running",
    };
    (window as unknown as { AudioContext: unknown }).AudioContext = vi.fn(() => ctx);
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [{ stop: vi.fn() }] })) }, configurable: true });
    /** Run animation frames for `ms` of simulated time (one frame per 50ms). */
    return (ms: number) => {
      for (let t = 0; t < ms; t += 50) {
        vi.advanceTimersByTime(50);
        const cb = frames.shift();
        if (cb) act(() => cb(performance.now()));
      }
    };
  }

  it("plays the chosen sound only after the room stays too loud, then waits between alerts", async () => {
    vi.useFakeTimers();
    audio.playSound.mockClear();
    let amp = 0.9; // very loud
    const run = loudMic(() => amp);
    const id = add("voice", { alertOn: true, alertSound: "bell", alertDelay: 2, alertCooldown: 10 });
    render(<Voice.Body id={id} view="normal" size="M" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable microphone/ }));
    });
    run(1500);
    expect(audio.playSound).not.toHaveBeenCalled(); // not yet: needs 2s in the red
    run(1000);
    expect(audio.playSound).toHaveBeenCalledTimes(1);
    expect(audio.playSound).toHaveBeenCalledWith("bell");
    expect(screen.getByTestId("loud-alert-flash")).toBeInTheDocument();
    run(5000);
    expect(audio.playSound).toHaveBeenCalledTimes(1); // cooldown
    run(6000);
    expect(audio.playSound).toHaveBeenCalledTimes(2);
    amp = 0.0005; // quiet
    run(15000);
    expect(audio.playSound).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("stays silent when the alert is off, and can be toggled from the widget", async () => {
    vi.useFakeTimers();
    audio.playSound.mockClear();
    const run = loudMic(() => 0.9);
    const id = add("voice");
    render(<Voice.Body id={id} view="normal" size="M" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enable microphone/ }));
    });
    run(5000);
    expect(audio.playSound).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("loud-alert-toggle"));
    expect(S().widgets[id].config.alertOn).toBe(true);
    run(2500);
    expect(audio.playSound).toHaveBeenCalledWith("attention");
    vi.useRealTimers();
  });
});
