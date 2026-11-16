import { describe, expect, it } from "vitest";
import { reminderDue, scheduleAt, type ReminderItem } from "./schedule";
import { dueScheduleEvents, endMessage } from "./schedule";

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

describe("dueScheduleEvents", () => {
  const periods = [
    { id: "a", name: "Period 1", start: "08:00", end: "08:50", classId: "c1" },
    { id: "b", name: "Period 2", start: "08:50", end: "09:40", classId: "c2" },
  ];
  it("fires a period's start and end once, within a 2-minute window", () => {
    expect(dueScheduleEvents(periods, 8 * 60, "d", []).map((e) => e.key)).toEqual(["d:a:start-at"]);
    expect(dueScheduleEvents(periods, 8 * 60 + 1, "d", ["d:a:start-at"])).toEqual([]);
    expect(dueScheduleEvents(periods, 8 * 60 + 5, "d", [])).toEqual([]); // too late, never fires hours afterwards
  });
  it("announces the end of one period before switching to the next class", () => {
    const due = dueScheduleEvents(periods, 8 * 60 + 50, "d", []);
    expect(due.map((e) => `${e.kind}:${e.period.id}`)).toEqual(["end:a", "start:b"]);
  });
  it("builds the spoken message", () => {
    expect(endMessage("{period} is over. Clean up!", periods[0])).toBe("Period 1 is over. Clean up!");
    expect(endMessage("", periods[1])).toBe("Period 2 is over.");
  });
});
