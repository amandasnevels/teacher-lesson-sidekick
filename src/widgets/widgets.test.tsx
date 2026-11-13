import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { visibleCoinSide, visibleDieFace, segmentAtPointer } from "@/lib/geometry";
import Timer from "./timer/Timer";
import Picker from "./picker/Picker";
import Participation from "./participation/Participation";
import Dice from "./dice/Dice";
import Coin from "./coin/Coin";
import Spinner from "./spinner/Spinner";

beforeEach(() => {
  resetStore();
  S().setPrefs({ reducedMotion: "on" });
});
afterEach(() => vi.useRealTimers());

describe("Timer widget", () => {
  it("starts, pauses, resumes and resets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 13, 9, 0, 0));
    const id = add("timer");
    render(<Timer.Body id={id} view="normal" size="M" />);
    const display = screen.getByTestId("timer-display");
    expect(display).toHaveTextContent("5:00");

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    expect(screen.getByTestId("timer-status")).toHaveTextContent("Running");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId("timer-display")).toHaveTextContent("4:57");

    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
    expect(screen.getByTestId("timer-status")).toHaveTextContent("Paused");
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId("timer-display")).toHaveTextContent("4:57");

    fireEvent.click(screen.getByRole("button", { name: "Resume timer" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId("timer-display")).toHaveTextContent("4:55");

    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByTestId("timer-display")).toHaveTextContent("5:00");
    expect(screen.getByTestId("timer-status")).toHaveTextContent("Ready");
  });

  it("two timers run independently", () => {
    vi.useFakeTimers();
    const a = add("timer");
    const b = add("timer", { durationSec: 60 });
    const { container } = render(
      <>
        <div data-testid="a"><Timer.Body id={a} view="normal" size="M" /></div>
        <div data-testid="b"><Timer.Body id={b} view="normal" size="M" /></div>
      </>,
    );
    void container;
    fireEvent.click(within(screen.getByTestId("a")).getByRole("button", { name: "Start timer" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(within(screen.getByTestId("a")).getByTestId("timer-display")).toHaveTextContent("4:55");
    expect(within(screen.getByTestId("b")).getByTestId("timer-display")).toHaveTextContent("1:00");
    expect(within(screen.getByTestId("b")).getByTestId("timer-status")).toHaveTextContent("Ready");
  });
});

describe("Name picker", () => {
  it("never repeats a name until the round is reset", () => {
    addClassWith("P1", ["Ana", "Ben", "Cy"]);
    const id = add("picker");
    render(<Picker.Body id={id} view="normal" size="M" />);
    const picked: string[] = [];
    for (let i = 0; i < 3; i++) {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: /Pick/ }));
      });
      picked.push(screen.getByTestId("picked-name").textContent!);
    }
    expect(new Set(picked).size).toBe(3);
    expect(screen.getByRole("button", { name: /Pick/ })).toBeDisabled();
    expect(screen.getByText(/Everyone has been picked/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reset round/ }));
    expect(screen.getByRole("button", { name: /Pick/ })).toBeEnabled();
    expect(screen.getByTestId("picker-progress")).toHaveTextContent("0 of 3");
  });
});

describe("class switching", () => {
  it("student widgets show the selected class's roster", () => {
    const c1 = addClassWith("P1", ["Ana", "Ben"]);
    const c2 = addClassWith("P2", ["Cy", "Dee", "Eli"]);
    S().setActiveClass(c1);
    const id = add("participation");
    render(<Participation.Body id={id} view="normal" size="M" />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Cy")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(screen.getByTestId("participation-progress")).toHaveTextContent("1 of 2");
    act(() => S().setActiveClass(c2));
    expect(screen.getByText("Cy")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByTestId("participation-progress")).toHaveTextContent("0 of 3");
    act(() => S().setActiveClass(c1));
    expect(screen.getByTestId("participation-progress")).toHaveTextContent("1 of 2");
  });

  it("general tools never require a roster", () => {
    const id = add("timer");
    render(<Timer.Body id={id} view="normal" size="M" />);
    expect(screen.getByRole("button", { name: "Start timer" })).toBeEnabled();
    expect(screen.queryByText(/roster/i)).toBeNull();
  });
});

function parseRotate(style: string, fn: "rotateX" | "rotateY" | "rotate") {
  const m = new RegExp(`${fn}\\((-?[\\d.]+)deg\\)`).exec(style);
  return m ? Number(m[1]) : NaN;
}

describe("animated randomizers land on the reported result", () => {
  it("dice: final transform shows the announced face", () => {
    const id = add("dice");
    render(<Dice.Body id={id} view="normal" size="S" />);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Roll/ }));
      const cube = screen.getByTestId("die-cube-0");
      expect(screen.getByRole("button", { name: /Roll/ })).toBeDisabled(); // no overlapping rolls
      fireEvent.transitionEnd(cube);
      const style = cube.getAttribute("style")!;
      const face = visibleDieFace(parseRotate(style, "rotateX"), parseRotate(style, "rotateY"));
      expect(String(face)).toBe(cube.getAttribute("data-result"));
      expect(screen.getByTestId("dice-result")).toHaveTextContent(`You rolled ${face}`);
    }
  });

  it("coin: final transform shows the announced side", () => {
    const id = add("coin");
    render(<Coin.Body id={id} view="normal" size="S" />);
    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Flip/ }));
      const coin = screen.getByTestId("coin");
      fireEvent.transitionEnd(coin);
      const side = visibleCoinSide(parseRotate(coin.getAttribute("style")!, "rotateX"));
      expect(screen.getByTestId("coin-result")).toHaveTextContent(side);
    }
  });

  it("spinner: segment under the pointer matches the displayed result", () => {
    const id = add("spinner");
    render(<Spinner.Body id={id} view="normal" size="M" />);
    const labels = (S().widgets[id].config.options as { label: string }[]).map((o) => o.label);
    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Spin/ }));
      const wheel = screen.getByTestId("spinner-wheel");
      fireEvent.transitionEnd(wheel);
      const idx = segmentAtPointer(parseRotate(wheel.getAttribute("style")!, "rotate"), labels.length);
      expect(screen.getByTestId("spinner-result")).toHaveTextContent(labels[idx]);
    }
  });
});
