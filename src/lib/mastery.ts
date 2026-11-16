/**
 * Mastery checks (Name Picker "correct / incorrect" mode).
 * Student results are class records: kept on this device, never exported, cleared with the class.
 */
import { randomInt } from "./random";

export type MasteryStatus = "correct" | "reteach" | "absent";

export interface MasteryResult {
  status: MasteryStatus;
  at: number;
  /** How many times the student was asked during this check. */
  tries: number;
  /** Answered correctly after needing reteach. */
  afterReteach?: boolean;
}

export interface MasteryCheck {
  id: string;
  objective: string;
  code?: string | null;
  teksId?: string | null;
  startedAt: number;
  endedAt?: number | null;
  results: Record<string, MasteryResult>;
}

export interface MasteryData {
  checks: MasteryCheck[];
}

export const activeCheck = (d: MasteryData | undefined) => d?.checks.find((c) => !c.endedAt) ?? null;

/**
 * Who to call next: students who haven't been called yet come first, then students marked
 * "needs reteach" get another turn. Absent and correct students are skipped.
 */
export function nextMasteryStudent(studentIds: string[], results: Record<string, MasteryResult>, exclude: string | null = null, rand = randomInt) {
  const fresh = studentIds.filter((id) => !results[id]);
  const reteach = studentIds.filter((id) => results[id]?.status === "reteach");
  const pool = fresh.length ? fresh : reteach.length > 1 ? reteach.filter((id) => id !== exclude) : reteach;
  if (!pool.length) return { id: null, phase: "done" as const };
  return { id: pool[rand(pool.length)], phase: fresh.length ? ("first" as const) : ("reteach" as const) };
}

export function masterySummary(studentIds: string[], results: Record<string, MasteryResult>) {
  const count = (s: MasteryStatus) => studentIds.filter((id) => results[id]?.status === s).length;
  return { correct: count("correct"), reteach: count("reteach"), absent: count("absent"), notYet: studentIds.filter((id) => !results[id]).length, total: studentIds.length };
}

export const STICKERS: { emoji: string; text: string }[] = [
  { emoji: "🌟", text: "Nice job!" },
  { emoji: "💡", text: "Great thinking!" },
  { emoji: "🤩", text: "Wow!" },
  { emoji: "🎯", text: "You nailed it!" },
  { emoji: "🚀", text: "Way to go!" },
  { emoji: "🏆", text: "Superstar!" },
  { emoji: "🧠", text: "Brilliant!" },
  { emoji: "👏", text: "Awesome work!" },
  { emoji: "🦄", text: "Fantastic!" },
  { emoji: "🔥", text: "On fire!" },
];
