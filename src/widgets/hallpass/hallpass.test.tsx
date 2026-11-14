import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { filterLog, logToCSV, dueReminders } from "@/lib/hallpass";
import { applyRetention } from "@/store/persist";
import { persistedSnapshot } from "@/store/store";
import { checkHallPasses } from "@/components/engines/HallPassEngine";
import HallPass from "./HallPass";

const audio = vi.hoisted(() => ({ playSound: vi.fn(() => true) }));
vi.mock("@/lib/audio", async (orig) => ({ ...(await orig<typeof import("@/lib/audio")>()), playSound: audio.playSound }));

beforeEach(() => resetStore());
afterEach(() => vi.useRealTimers());

const sid = (classId: string, name: string) => S().classes.find((c) => c.id === classId)!.students.find((s) => s.name === name)!.id;

describe("hall pass records", () => {
  it("checks out, prevents double check-out, checks in and logs times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 9, 0));
    const c1 = addClassWith("P1", ["Ana", "Ben"]);
    expect(S().hallCheckOut(c1, sid(c1, "Ana"), "Restroom")).toBe(true);
    expect(S().hallCheckOut(c1, sid(c1, "Ana"), "Water")).toBe(false); // already out
    vi.setSystemTime(new Date(2026, 10, 16, 9, 6));
    const entry = S().records.hallpass[c1].out[0];
    S().hallCheckIn(c1, entry.id);
    const hp = S().records.hallpass[c1];
    expect(hp.out).toHaveLength(0);
    expect(hp.log[0]).toMatchObject({ name: "Ana", destination: "Restroom", source: "teacher" });
    expect(hp.log[0].inAt! - hp.log[0].outAt).toBe(6 * 60000);
    S().undo(); // undo the check-in
    expect(S().records.hallpass[c1].out).toHaveLength(1);
  });

  it("keeps each class separate and supports check-in-all", () => {
    const c1 = addClassWith("P1", ["Ana", "Ben"]);
    const c2 = addClassWith("P2", ["Cy"]);
    S().hallCheckOut(c1, sid(c1, "Ana"), "Nurse");
    S().hallCheckOut(c1, sid(c1, "Ben"), "Office");
    S().hallCheckOut(c2, sid(c2, "Cy"), "Water");
    S().hallCheckInAll(c1);
    expect(S().records.hallpass[c1].out).toHaveLength(0);
    expect(S().records.hallpass[c1].log).toHaveLength(2);
    expect(S().records.hallpass[c2].out).toHaveLength(1);
  });

  it("never saves the log when student data is session-only", () => {
    const c1 = addClassWith("P1", ["Ana Secret"]);
    S().hallCheckOut(c1, sid(c1, "Ana Secret"), "Restroom");
    S().setPrefs({ studentDataRetention: "session" });
    expect(JSON.stringify(applyRetention(persistedSnapshot()))).not.toContain("Ana Secret");
  });
});

describe("hall pass helpers", () => {
  const base = { studentId: "s1", name: "Ana, Jr.", destination: "Nurse", source: "teacher" as const };
  it("filters the log by day and student, newest first", () => {
    const now = new Date(2026, 10, 16, 12, 0);
    const log = [
      { ...base, id: "a", outAt: new Date(2026, 10, 16, 9, 0).getTime(), inAt: new Date(2026, 10, 16, 9, 5).getTime() },
      { ...base, id: "b", outAt: new Date(2026, 10, 16, 10, 0).getTime(), inAt: new Date(2026, 10, 16, 10, 3).getTime() },
      { ...base, id: "c", studentId: "s2", outAt: new Date(2026, 10, 10, 9, 0).getTime(), inAt: new Date(2026, 10, 10, 9, 2).getTime() },
    ];
    expect(filterLog(log, "today", null, now).map((e) => e.id)).toEqual(["b", "a"]);
    expect(filterLog(log, "all", "s2", now).map((e) => e.id)).toEqual(["c"]);
  });

  it("exports a spreadsheet-safe CSV with dates, times and minutes", () => {
    const csv = logToCSV([{ ...base, id: "a", outAt: new Date(2026, 10, 16, 9, 0).getTime(), inAt: new Date(2026, 10, 16, 9, 6).getTime() }], "Period 1");
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Class,Date,Student,Destination,Time out,Time in,Minutes out,Checked out by");
    expect(row).toBe('Period 1,2026-11-16,"Ana, Jr.",Nurse,09:00,09:06,6.0,teacher');
  });

  it("reminds once per overdue trip", () => {
    const out = [{ ...base, id: "a", outAt: 0 }, { ...base, id: "b", outAt: 0, remindedAt: 1 }];
    expect(dueReminders(out, 5, 4 * 60000)).toHaveLength(0);
    expect(dueReminders(out, 5, 5 * 60000).map((e) => e.id)).toEqual(["a"]);
  });

  it("the reminder engine alerts the teacher once, with sound", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 9, 0));
    audio.playSound.mockClear();
    const c1 = addClassWith("P1", ["Ana"]);
    add("hallpass", { reminderOn: true, reminderMinutes: 5, reminderSound: true });
    S().hallCheckOut(c1, sid(c1, "Ana"), "Water");
    checkHallPasses(Date.now() + 4 * 60000);
    expect(S().toasts.some((t) => t.message.includes("Ana"))).toBe(false);
    checkHallPasses(Date.now() + 5 * 60000);
    checkHallPasses(Date.now() + 6 * 60000);
    expect(S().toasts.filter((t) => t.message.includes("Ana has been at Water"))).toHaveLength(1);
    expect(audio.playSound).toHaveBeenCalledTimes(1);
  });
});

describe("Hall Pass widget", () => {
  it("checks a student out in two taps and back in with one", () => {
    addClassWith("P1", ["Ana", "Ben"]);
    const id = add("hallpass", { display: "names" });
    render(<HallPass.Body id={id} view="normal" size="M" />);
    expect(screen.getByTestId("hall-count")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: /Check in/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Check out/ }));
    const dialog = screen.getByRole("dialog", { name: "Check out" });
    expect(within(dialog).getByRole("button", { name: /Restroom/ })).toBeDisabled(); // pick a student first
    fireEvent.click(within(dialog).getByRole("option", { name: "Ana" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Nurse/ }));
    expect(screen.queryByRole("dialog", { name: "Check out" })).toBeNull();
    expect(screen.getByTestId("hall-count")).toHaveTextContent("1");
    expect(screen.getByTestId("hall-names")).toHaveTextContent("Ana");
    expect(screen.getByTestId("hall-names")).toHaveTextContent("Nurse");

    // A student who is out can't be checked out again.
    fireEvent.click(screen.getByRole("button", { name: /Check out/ }));
    expect(within(screen.getByRole("dialog", { name: "Check out" })).getByRole("option", { name: /Ana/ })).toBeDisabled();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Check out" })).getAllByRole("button", { name: "Close" })[0]);

    fireEvent.click(screen.getByRole("button", { name: /^Check in$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check in Ana" }));
    expect(screen.getByTestId("hall-count")).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: /Out-of-room log/ }));
    expect(screen.getByTestId("hall-log")).toHaveTextContent("Ana");
    expect(screen.getByTestId("hall-log-summary")).toHaveTextContent("1 trip");
  });

  it("adds a custom place from the check-out window", () => {
    addClassWith("P1", ["Ana"]);
    const id = add("hallpass");
    render(<HallPass.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Check out/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add place/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "New place" }), { target: { value: "Library" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(S().widgets[id].config.destinations).toContain("Library");
    fireEvent.click(screen.getByRole("option", { name: "Ana" }));
    fireEvent.click(screen.getByRole("button", { name: /Library/ }));
    act(() => {});
    expect(screen.getByTestId("hall-count")).toHaveTextContent("1");
  });

  it("can show just the count", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    const id = add("hallpass", { display: "count" });
    S().hallCheckOut(c1, sid(c1, "Ana"), "Water");
    render(<HallPass.Body id={id} view="normal" size="M" />);
    expect(screen.getByTestId("hall-count")).toHaveTextContent("1");
    expect(screen.queryByTestId("hall-names")).toBeNull();
  });
});
