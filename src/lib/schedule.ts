import { parseHM } from "./time";

export interface Period {
  id: string;
  name: string;
  start: string; // HH:MM
  end: string; // HH:MM
  /** Class taught this period: becomes the Active Class when the period starts. */
  classId?: string | null;
}

export interface ScheduleNow {
  current: Period | null;
  next: Period | null;
  /** Minutes (fractional) until the next transition (end of current, or start of next). */
  minutesToTransition: number | null;
  transitionLabel: string | null;
}

export function sortedPeriods(periods: Period[]): Period[] {
  return periods.filter((p) => parseHM(p.start) != null && parseHM(p.end) != null).sort((a, b) => parseHM(a.start)! - parseHM(b.start)!);
}

export function scheduleAt(periods: Period[], nowMin: number): ScheduleNow {
  const list = sortedPeriods(periods);
  const current = list.find((p) => parseHM(p.start)! <= nowMin && nowMin < parseHM(p.end)!) ?? null;
  const next = list.find((p) => parseHM(p.start)! > nowMin) ?? null;
  if (current) {
    return { current, next, minutesToTransition: parseHM(current.end)! - nowMin, transitionLabel: `${current.name} ends` };
  }
  if (next) return { current: null, next, minutesToTransition: parseHM(next.start)! - nowMin, transitionLabel: `${next.name} starts` };
  return { current: null, next: null, minutesToTransition: null, transitionLabel: null };
}

export interface ReminderItem {
  id: string;
  text: string;
  /** HH:MM, or derived from a period when periodId is set. */
  time: string;
  repeat: "once" | "daily" | "weekdays";
  audible: boolean;
  enabled: boolean;
  periodId?: string | null;
  /** Minutes relative to the period start (negative = before). */
  offset?: number;
  firedKey?: string | null;
}

/** Minute of day when a reminder fires, or null if unresolvable. */
export function reminderMinute(r: ReminderItem, periods: Period[]): number | null {
  if (r.periodId) {
    const p = periods.find((x) => x.id === r.periodId);
    const s = p ? parseHM(p.start) : null;
    return s == null ? null : s + (r.offset ?? 0);
  }
  return parseHM(r.time);
}

/** Should this reminder fire now? A 2-minute window tolerates throttled background tabs. */
export function reminderDue(r: ReminderItem, periods: Period[], now: Date, today: string): boolean {
  if (!r.enabled || r.firedKey === today) return false;
  const day = now.getDay();
  if (r.repeat === "weekdays" && (day === 0 || day === 6)) return false;
  const m = reminderMinute(r, periods);
  if (m == null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= m && nowMin < m + 2;
}

export interface ScheduleEvent {
  kind: "start" | "end";
  period: Period;
  /** Fires once per day per period/kind. */
  key: string;
}

/**
 * Period starts and ends that are due right now and haven't fired today. A 2-minute window
 * tolerates throttled background tabs without firing late events hours afterwards.
 */
export function dueScheduleEvents(periods: Period[], nowMin: number, today: string, fired: string[]): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];
  for (const p of sortedPeriods(periods)) {
    for (const kind of ["start", "end"] as const) {
      const at = parseHM(kind === "start" ? p.start : p.end)!;
      const key = `${today}:${p.id}:${kind}-at`;
      if (!fired.includes(key) && nowMin >= at && nowMin < at + 2) out.push({ kind, period: p, key });
    }
  }
  // An end and the next start at the same minute: announce the end first.
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "end" ? -1 : 1));
}

/** The words read aloud at the end of a period. `{period}` is replaced with its name. */
export function endMessage(template: string, period: Period): string {
  return (template || "{period} is over.").replace(/\{period\}/g, period.name).slice(0, 200);
}
