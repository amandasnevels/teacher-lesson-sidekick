/** Hall pass helpers: overdue checks, log filtering and CSV export. */
import type { HallPassEntry } from "./types";
import { dayKey, weekKey } from "./time";

export const DEFAULT_DESTINATIONS = ["Restroom", "Nurse", "Water", "Office"];

export const DESTINATION_EMOJI: Record<string, string> = { Restroom: "🚻", Nurse: "🩺", Water: "💧", Office: "🏫", Library: "📚", Counselor: "💬", Locker: "🔐" };

export function minutesOut(e: HallPassEntry, now = Date.now()): number {
  return ((e.inAt ?? now) - e.outAt) / 60000;
}

export function isOverdue(e: HallPassEntry, reminderMinutes: number, now = Date.now()): boolean {
  return !e.inAt && reminderMinutes > 0 && minutesOut(e, now) >= reminderMinutes;
}

/** Entries that should trigger a reminder right now (each entry is reminded once). */
export function dueReminders(out: HallPassEntry[], reminderMinutes: number, now = Date.now()): HallPassEntry[] {
  return out.filter((e) => !e.remindedAt && isOverdue(e, reminderMinutes, now));
}

export type LogRange = "today" | "week" | "all";

export function filterLog(log: HallPassEntry[], range: LogRange, studentId: string | null, now = new Date()): HallPassEntry[] {
  const today = dayKey(now);
  const week = weekKey(now);
  return log
    .filter((e) => (range === "today" ? dayKey(new Date(e.outAt)) === today : range === "week" ? weekKey(new Date(e.outAt)) === week : true))
    .filter((e) => !studentId || e.studentId === studentId)
    .sort((a, b) => b.outAt - a.outAt);
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatElapsed(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with local dates/times; spreadsheet-friendly. */
export function logToCSV(entries: HallPassEntry[], className: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const time = (t: number) => {
    const d = new Date(t);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const rows = [["Class", "Date", "Student", "Destination", "Time out", "Time in", "Minutes out", "Checked out by"]];
  for (const e of [...entries].sort((a, b) => a.outAt - b.outAt)) {
    rows.push([className, date(e.outAt), e.name, e.destination, time(e.outAt), e.inAt ? time(e.inAt) : "", e.inAt ? minutesOut(e).toFixed(1) : "", e.source]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
