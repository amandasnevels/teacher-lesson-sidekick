import { describe, expect, it } from "vitest";
import { FACT_LEVELS, generateFact, nextFact, type FactOp } from "./mathFacts";
import { GRADE_BANDS, drawQuestion, mathQuestion, staticQuestions } from "./quizBank";

/** Evaluate a generated prompt independently of the generator. */
function evalPrompt(prompt: string, answer: number): number {
  if (prompt.includes("☐")) {
    const a = Number(prompt.split(" + ")[0]);
    return a + answer === 10 ? answer : NaN;
  }
  const [a, op, b] = prompt.split(" ");
  const x = Number(a);
  const y = Number(b);
  return op === "+" ? x + y : op === "−" ? x - y : op === "×" ? x * y : x / y;
}

describe("Fast Facts generator", () => {
  const ops: FactOp[] = ["add", "sub", "mul", "div", "mixed"];
  it("always produces correct, in-range facts for every topic and level", () => {
    for (const op of ops)
      for (const { value: level } of FACT_LEVELS[op])
        for (const focus of [0, 1, 7, 12])
          for (let i = 0; i < 300; i++) {
            const f = generateFact(op, level, focus);
            expect(evalPrompt(f.prompt, f.answer), `${op}/${level}: ${f.prompt}`).toBe(f.answer);
            expect(Number.isInteger(f.answer) && f.answer >= 0).toBe(true); // no negatives, no fractions
            const nums = f.prompt.match(/\d+/g)!.map(Number);
            if (level === "within5") expect(Math.max(...nums, f.answer)).toBeLessThanOrEqual(5);
            if (level === "within10") expect(Math.max(...nums, f.answer)).toBeLessThanOrEqual(10);
            if (level === "within20") expect(Math.max(...nums, f.answer)).toBeLessThanOrEqual(20);
            if (op === "mul" && level === "to5") expect(Math.max(...nums.slice(0, 2))).toBeLessThanOrEqual(5);
            if (op === "mul" && level === "focus") expect(nums.slice(0, 2)).toContain(focus);
            if (op === "div" && level === "focus") expect(nums[1]).toBe(Math.max(1, focus));
          }
  });

  it("does not repeat the same fact twice in a row", () => {
    let prev: string | null = null;
    for (let i = 0; i < 200; i++) {
      const f = nextFact("mul", "to5", 7, prev);
      expect(f.key).not.toBe(prev);
      prev = f.key;
    }
  });
});

describe("Quick Fact Game bank", () => {
  it("has at least 10 questions with answers for every grade band and subject", () => {
    const ids = new Set<string>();
    for (const { value: g } of GRADE_BANDS)
      for (const subj of ["science", "social", "ela"] as const) {
        const qs = staticQuestions(subj, g);
        expect(qs.length).toBeGreaterThanOrEqual(10);
        for (const q of qs) {
          expect(q.q.trim().length).toBeGreaterThan(5);
          expect(q.a.trim().length).toBeGreaterThan(0);
          expect(ids.has(q.id)).toBe(false);
          ids.add(q.id);
        }
      }
  });

  it("generated math answers are correct for every grade band", () => {
    for (const { value: g } of GRADE_BANDS)
      for (let i = 0; i < 400; i++) {
        const m = mathQuestion(g);
        let mm: RegExpMatchArray | null;
        if ((mm = /^What is (-?\d+) ([+−×÷]) \(?(-?\d+)\)?\?$/.exec(m.q))) {
          const [x, op, y] = [Number(mm[1]), mm[2], Number(mm[3])];
          expect(Number(m.a)).toBe(op === "+" ? x + y : op === "−" ? x - y : op === "×" ? x * y : x / y);
        } else if ((mm = /^Solve for x: (\d+)x ([+−]) (\d+) = (-?\d+)$/.exec(m.q))) {
          const x = Number(m.a.replace("x = ", ""));
          expect(Number(mm[1]) * x + (mm[2] === "+" ? 1 : -1) * Number(mm[3])).toBe(Number(mm[4]));
        } else if ((mm = /^What is (\d+)% of (\d+)\?$/.exec(m.q))) {
          expect(Number(m.a)).toBeCloseTo((Number(mm[1]) * Number(mm[2])) / 100);
          expect(Number.isInteger(Number(m.a))).toBe(true);
        }
        expect(m.a).not.toMatch(/NaN|undefined|Infinity/);
      }
  });

  it("never repeats a question within a round, then reports the round complete", () => {
    let used: string[] = [];
    const seen = new Set<string>();
    for (;;) {
      const d = drawQuestion("6-8", "science", used);
      if (!d.question) break;
      expect(seen.has(d.question.id)).toBe(false);
      seen.add(d.question.id);
      used = d.used;
    }
    expect(seen.size).toBe(staticQuestions("science", "6-8").length);
  });

  it("uses the teacher's own questions", () => {
    const custom = [{ id: "a", q: "Capital of our state?", a: "Sacramento" }, { id: "b", q: "", a: "" }];
    const d = drawQuestion("3-5", "custom", [], custom);
    expect(d.question?.a).toBe("Sacramento");
    expect(drawQuestion("3-5", "custom", d.used, custom).question).toBeNull(); // blank one is skipped
  });
});
