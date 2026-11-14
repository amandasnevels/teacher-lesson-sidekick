/**
 * Math fact generators (pure, deterministic given a random source). Every fact is correct by construction:
 * subtraction never goes negative, division always divides evenly.
 */
import { randomInt } from "@/lib/random";

export type FactOp = "add" | "sub" | "mul" | "div" | "mixed";

export interface MathFact {
  /** Display text, e.g. "7 × 8" or "7 + ☐ = 10". */
  prompt: string;
  answer: number;
  /** Stable key for avoiding immediate repeats. */
  key: string;
}

export const FACT_LEVELS: Record<FactOp, { value: string; label: string }[]> = {
  add: [
    { value: "within5", label: "Within 5" },
    { value: "within10", label: "Within 10" },
    { value: "within20", label: "Within 20" },
    { value: "doubles", label: "Doubles" },
    { value: "make10", label: "Make 10" },
  ],
  sub: [
    { value: "within5", label: "Within 5" },
    { value: "within10", label: "Within 10" },
    { value: "within20", label: "Within 20" },
  ],
  mul: [
    { value: "to5", label: "Tables 0–5" },
    { value: "to10", label: "Tables 0–10" },
    { value: "to12", label: "Tables 0–12" },
    { value: "focus", label: "Focus on one number" },
  ],
  div: [
    { value: "to5", label: "Divide by 1–5" },
    { value: "to10", label: "Divide by 1–10" },
    { value: "to12", label: "Divide by 1–12" },
    { value: "focus", label: "Focus on one number" },
  ],
  mixed: [
    { value: "addsub20", label: "+ and − within 20" },
    { value: "muldiv10", label: "× and ÷ to 10" },
    { value: "all", label: "All four (to 10)" },
  ],
};

export const OP_LABELS: Record<FactOp, string> = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division", mixed: "Mixed" };

type Rand = (n: number) => number;
const r = (lo: number, hi: number, rand: Rand) => lo + rand(hi - lo + 1); // inclusive

function addWithin(n: number, rand: Rand): MathFact {
  const a = r(0, n, rand);
  const b = r(0, n - a, rand);
  return { prompt: `${a} + ${b}`, answer: a + b, key: `${a}+${b}` };
}
function subWithin(n: number, rand: Rand): MathFact {
  const a = r(0, n, rand);
  const b = r(0, a, rand);
  return { prompt: `${a} − ${b}`, answer: a - b, key: `${a}-${b}` };
}
function mulTo(n: number, rand: Rand, focus?: number): MathFact {
  let a = focus ?? r(0, n, rand);
  let b = r(0, focus != null ? 12 : n, rand);
  if (focus != null && rand(2) === 1) [a, b] = [b, a];
  return { prompt: `${a} × ${b}`, answer: a * b, key: `${a}*${b}` };
}
function divTo(n: number, rand: Rand, focus?: number): MathFact {
  const d = focus != null ? Math.max(1, focus) : r(1, n, rand);
  const q = r(0, focus != null ? 12 : n, rand);
  return { prompt: `${d * q} ÷ ${d}`, answer: q, key: `${d * q}/${d}` };
}

export function generateFact(op: FactOp, level: string, focus = 7, rand: Rand = randomInt): MathFact {
  switch (op) {
    case "add":
      if (level === "doubles") {
        const n = r(0, 10, rand);
        return { prompt: `${n} + ${n}`, answer: 2 * n, key: `${n}+${n}` };
      }
      if (level === "make10") {
        const a = r(0, 10, rand);
        return { prompt: `${a} + ☐ = 10`, answer: 10 - a, key: `m10-${a}` };
      }
      return addWithin(level === "within5" ? 5 : level === "within20" ? 20 : 10, rand);
    case "sub":
      return subWithin(level === "within5" ? 5 : level === "within20" ? 20 : 10, rand);
    case "mul":
      return level === "focus" ? mulTo(12, rand, clampFocus(focus, 0)) : mulTo(level === "to5" ? 5 : level === "to12" ? 12 : 10, rand);
    case "div":
      return level === "focus" ? divTo(12, rand, clampFocus(focus, 1)) : divTo(level === "to5" ? 5 : level === "to12" ? 12 : 10, rand);
    case "mixed": {
      const ops = level === "addsub20" ? ["add", "sub"] : level === "muldiv10" ? ["mul", "div"] : ["add", "sub", "mul", "div"];
      const pick = ops[rand(ops.length)];
      if (pick === "add") return addWithin(level === "addsub20" ? 20 : 10, rand);
      if (pick === "sub") return subWithin(level === "addsub20" ? 20 : 10, rand);
      if (pick === "mul") return mulTo(10, rand);
      return divTo(10, rand);
    }
  }
}

function clampFocus(n: number, min: number) {
  return Math.max(min, Math.min(12, Math.round(Number.isFinite(n) ? n : 7)));
}

/** Next fact, avoiding an immediate repeat of the previous one. */
export function nextFact(op: FactOp, level: string, focus: number, prevKey: string | null, rand: Rand = randomInt): MathFact {
  let f = generateFact(op, level, focus, rand);
  for (let i = 0; i < 12 && f.key === prevKey; i++) f = generateFact(op, level, focus, rand);
  return f;
}
