import { describe, expect, it } from "vitest";
import { reminderDue, scheduleAt, type ReminderItem } from "./schedule";

const periods = [
  { id: "a", name: "Reading", start: "08:00", end: "09:00" },
  { id: "b", name: "Math", start: "09:10", end: "10:00" },
];

describe("schedule awareness", () => {
  it("finds the current period and time to the next transition", () => {
    const s = scheduleAt(periods, 8 * 60 + 45);
    expect(s.current?.name).toBe("Reading");
    expect(s.minutesToTransition).toBe(15);
    const gap = scheduleAt(periods, 9 * 60 + 5);
    expect(gap.current).toBeNull();
    expect(gap.next?.name).toBe("Math");
    expect(gap.minutesToTransition).toBe(5);
  });

  it("fires reminders once per day, honoring weekdays and period links", () => {
    const r: ReminderItem = { id: "r", text: "Collect forms", time: "09:00", repeat: "weekdays", audible: false, enabled: true };
    const fri = new Date(2026, 10, 13, 9, 1);
    const sat = new Date(2026, 10, 14, 9, 1);
    expect(reminderDue(r, periods, fri, "2026-11-13")).toBe(true);
    expect(reminderDue({ ...r, firedKey: "2026-11-13" }, periods, fri, "2026-11-13")).toBe(false);
    expect(reminderDue(r, periods, sat, "2026-11-14")).toBe(false);
    const linked: ReminderItem = { ...r, repeat: "daily", periodId: "b", offset: -5 };
    expect(reminderDue(linked, periods, new Date(2026, 10, 14, 9, 5), "x")).toBe(true);
    expect(reminderDue(linked, periods, new Date(2026, 10, 14, 9, 8), "x")).toBe(false);
  });
});
