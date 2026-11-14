import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { add, resetStore, S } from "@/test-utils";
import Quiz from "./quiz/Quiz";
import FastFacts from "./fastfacts/FastFacts";

beforeEach(() => resetStore());

describe("Quick Fact Game widget", () => {
  it("shows a question for the chosen grade and subject, reveals the answer, and scores teams", () => {
    const id = add("quiz", { grade: "K-2", subject: "science", thinkSeconds: 0, teams: true });
    render(<Quiz.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByTestId("quiz-question").textContent).toBeTruthy();
    expect(screen.queryByTestId("quiz-answer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Reveal answer/ }));
    expect(screen.getByTestId("quiz-answer").textContent).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a point to Team 1" }));
    expect(screen.getByTestId("quiz-score-0")).toHaveTextContent("1");
    // Switching subject starts a new set.
    fireEvent.click(screen.getByRole("radio", { name: /ELA/ }));
    expect(S().widgets[id].config.subject).toBe("ela");
    expect(screen.queryByTestId("quiz-question")).toBeNull();
  });
});

describe("Fast Facts widget", () => {
  it("shows facts for the chosen topic, reveals answers and counts the set", () => {
    const id = add("fastfacts", { op: "add", level: "within10", pace: 0, setSize: 10 });
    render(<FastFacts.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(screen.getByTestId("fact-prompt").textContent).toMatch(/^\d+ \+ \d+ = \?$/);
    fireEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    const [a, b, ans] = screen.getByTestId("fact-prompt").textContent!.match(/\d+/g)!.map(Number);
    expect(a + b).toBe(ans);
    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByTestId("fact-count")).toHaveTextContent("10 of 10");
    fireEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText(/Set complete/)).toBeInTheDocument();
    // Changing topic starts fresh.
    act(() => S().updateConfig(id, { op: "mul", level: "to12" }));
    expect(screen.queryByTestId("fact-count")).toBeNull();
  });
});
