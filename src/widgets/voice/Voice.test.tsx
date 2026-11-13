import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { add, resetStore } from "@/test-utils";
import Voice from "./Voice";

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
