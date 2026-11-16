import { persistedSnapshot } from "./store";
import { beforeEach, describe, expect, it } from "vitest";
import { scopeKey } from "./store";
import { runRoutine, startTimerFor } from "./actions";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import type { TimerSession } from "@/widgets/timer/timerLogic";
import { drawNext } from "@/widgets/picker/Picker";

beforeEach(() => resetStore());

describe("widget instances", () => {
  it("multiple timers keep independent sessions", () => {
    const a = add("timer");
    const b = add("timer");
    S().setSession<TimerSession>(a, { status: "running", durationMs: 1, endAt: 99, remainingMs: 1, station: 0, round: 1 });
    expect(S().sessions[a]).toBeDefined();
    expect(S().sessions[b]).toBeUndefined();
    S().updateConfig(b, { durationSec: 60 });
    expect(S().widgets[a].config.durationSec).toBe(300);
  });

  it("duplicating a running timer copies settings but starts fresh", () => {
    const a = add("timer", { durationSec: 420, repeat: true });
    startTimerFor(420);
    expect((S().sessions[a] as TimerSession).status).toBe("running");
    const copy = S().duplicateWidget(a)!;
    expect(copy).not.toBe(a);
    expect(S().widgets[copy].config).toEqual(S().widgets[a].config);
    expect(S().widgets[copy].config).not.toBe(S().widgets[a].config); // deep copy
    expect(S().sessions[copy]).toBeUndefined(); // fresh, stopped session
    // inserted right after the original
    expect(S().workspaces[0].widgetIds).toEqual([a, copy]);
  });

  it("removing preserves data and the widget can be restored", () => {
    const n = add("notes");
    S().updateConfig(n, { text: { general: "Remember field trip forms" } });
    S().removeWidget(n);
    expect(S().workspaces[0].widgetIds).not.toContain(n);
    expect(S().widgets[n].removedAt).toBeTruthy();
    expect(S().toasts.at(-1)?.actionLabel).toBe("Undo");
    S().restoreWidget(n);
    expect(S().workspaces[0].widgetIds).toContain(n);
    expect((S().widgets[n].config.text as Record<string, string>).general).toBe("Remember field trip forms");
  });

  it("permanent deletion removes the instance", () => {
    const n = add("tally");
    S().removeWidget(n);
    S().deleteWidgetForever(n);
    expect(S().widgets[n]).toBeUndefined();
  });

  it("favorites create independent instances", () => {
    const sp = add("spinner");
    const fav = S().saveFavorite(sp, "Centers wheel")!;
    const one = S().addFromFavorite(fav)!;
    const two = S().addFromFavorite(fav)!;
    S().updateConfig(one, { options: [{ id: "x", label: "Changed" }, { id: "y", label: "Only" }] });
    expect(S().widgets[two].config.options).toEqual(S().widgets[sp].config.options);
    expect(S().favorites[0].config.options).toEqual(S().widgets[sp].config.options);
    expect(S().widgets[one].title).toBe("Centers wheel");
  });

  it("duplicates and favorites keep the resized width and height", () => {
    const t = add("timer");
    S().updateWidget(t, { w: 3, h: 480 });
    const copy = S().duplicateWidget(t)!;
    expect(S().widgets[copy]).toMatchObject({ w: 3, h: 480 });
    const fav = S().saveFavorite(t, "Big timer")!;
    const fromFav = S().addFromFavorite(fav)!;
    expect(S().widgets[fromFav]).toMatchObject({ w: 3, h: 480 });
  });

  it("favorites of notes keep style but not text", () => {
    const n = add("notes", { fontSize: "lg", text: { general: "private" } });
    const fav = S().saveFavorite(n, "Big note")!;
    expect(S().favorites.find((f) => f.id === fav)!.config).toMatchObject({ fontSize: "lg", text: {} });
  });

  it("spinner and choice option lists are stored separately", () => {
    const sp = add("spinner");
    const ch = add("choice");
    const spBefore = JSON.stringify(S().widgets[sp].config.options);
    S().updateConfig(ch, { options: [{ id: "1", label: "A" }, { id: "2", label: "B" }] });
    expect(JSON.stringify(S().widgets[sp].config.options)).toBe(spBefore);
    S().updateConfig(sp, { options: [{ id: "3", label: "C" }, { id: "4", label: "D" }] });
    expect(S().widgets[ch].config.options).toEqual([{ id: "1", label: "A" }, { id: "2", label: "B" }]);
  });
});

describe("classes and class data", () => {
  it("random picking never repeats a student before reset", () => {
    const ids = ["a", "b", "c", "d", "e"];
    let drawn: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const next = drawNext(ids, drawn)!;
      expect(drawn).not.toContain(next);
      drawn = [...drawn, next];
    }
    expect(drawNext(ids, drawn)).toBeNull();
    expect(new Set(drawn).size).toBe(5);
  });

  it("point totals are class-specific", () => {
    const c1 = addClassWith("Period 1", ["Ana", "Ben"]);
    const c2 = addClassWith("Period 2", ["Cy"]);
    S().addPoints(c1, { kind: "class", id: c1 }, 3);
    S().addPoints(c2, { kind: "class", id: c2 }, 1);
    const ana = S().classes.find((c) => c.id === c1)!.students[0].id;
    S().addPoints(c1, { kind: "student", id: ana }, 2);
    expect(S().records.points[c1].whole).toBe(3);
    expect(S().records.points[c2].whole).toBe(1);
    expect(S().records.points[c1].students[ana]).toBe(2);
    S().undoLastPoints(c1);
    expect(S().records.points[c1].students[ana]).toBe(0);
    S().resetPoints(c2);
    expect(S().records.points[c1].whole).toBe(3);
  });

  it("participation resets only the chosen class's lesson", () => {
    const c1 = addClassWith("P1", ["Ana", "Ben"]);
    const c2 = addClassWith("P2", ["Cy"]);
    const ana = S().classes[0].students[0].id;
    const cy = S().classes[1].students[0].id;
    S().toggleParticipation(c1, ana);
    S().toggleParticipation(c2, cy);
    S().resetParticipation(c1);
    expect(S().records.participation[c1].checked).toEqual([]);
    expect(S().records.participation[c2].checked).toEqual([cy]);
    // The finished session is kept as history, and the whole step can be undone.
    expect(S().records.participation[c1].sessions?.[0].checked).toEqual([ana]);
    expect(S().records.participation[c2].sessions ?? []).toEqual([]);
    S().undo();
    expect(S().records.participation[c1].checked).toEqual([ana]);
  });

  it("a new school day starts a fresh participation session without losing the old one", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    const ana = S().classes[0].students[0].id;
    S().toggleParticipation(c1, ana);
    const p = S().records.participation[c1];
    S().replaceAll({ ...persistedSnapshot(), records: { ...S().records, participation: { [c1]: { ...p, lessonStartedAt: Date.now() - 86_400_000 * 2 } } } });
    S().ensureParticipationDay(c1);
    expect(S().records.participation[c1].checked).toEqual([]);
    expect(S().records.participation[c1].sessions?.[0].checked).toEqual([ana]);
    S().toggleParticipation(c1, ana);
    S().ensureParticipationDay(c1); // same day: nothing changes
    expect(S().records.participation[c1].checked).toEqual([ana]);
  });

  it("switching workspaces never touches class data", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    S().addPoints(c1, { kind: "class", id: c1 }, 5);
    const ws2 = S().addWorkspace("Other");
    S().setActiveWorkspace(ws2);
    S().setActiveWorkspace("ws1");
    expect(S().records.points[c1].whole).toBe(5);
    expect(S().activeClassId).toBe(c1);
  });

  it("switching classes keeps the workspace and offers the class's last-used one", () => {
    const ws2 = S().addWorkspace("Math block");
    S().setActiveWorkspace("ws1");
    const c1 = S().addClass("P1");
    const c2 = S().addClass("P2");
    S().setActiveClass(c1);
    S().setActiveWorkspace(ws2); // P1 last used Math block
    S().setActiveClass(c2, { prompt: true });
    expect(S().activeWorkspaceId).toBe(ws2); // never switched automatically
    expect(S().classSwitchPrompt).toEqual({ classId: c2, lastWorkspaceId: null });
    S().setActiveWorkspace("ws1"); // P2 picks ws1
    S().setActiveClass(c1, { prompt: true });
    expect(S().activeWorkspaceId).toBe("ws1");
    expect(S().classSwitchPrompt).toEqual({ classId: c1, lastWorkspaceId: ws2 });
  });

  it("picker rounds are kept per class", () => {
    const p = add("picker");
    S().setPickerDrawn(scopeKey("c1", p), ["s1"]);
    expect(S().records.picker[scopeKey("c2", p)]).toBeUndefined();
  });

  it("deleting a workspace sends its widgets to Removed (recoverable)", () => {
    const ws2 = S().addWorkspace("Temp");
    const t = S().addWidget("timer", { workspaceId: ws2 });
    S().deleteWorkspace(ws2);
    expect(S().widgets[t].removedAt).toBeTruthy();
  });
});

describe("Quick Routines", () => {
  it("execute only their intended actions", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    S().addPoints(c1, { kind: "class", id: c1 }, 4);
    const timer = add("timer");
    const voice = add("voice");
    const status = add("status");
    const notes = add("notes");
    const before = { timerSession: S().sessions[timer], status: S().widgets[status].config.current, notes: S().widgets[notes], records: S().records };
    S().upsertRoutine({ id: "r1", name: "Quiet", icon: "🤫", color: "sky", actions: [{ kind: "setVoiceLevel", level: "silent" }] });
    runRoutine("r1");
    expect(S().widgets[voice].config.level).toBe("silent");
    expect(S().sessions[timer]).toBe(before.timerSession);
    expect(S().widgets[status].config.current).toBe(before.status);
    expect(S().widgets[notes]).toBe(before.notes);
    expect(S().records).toBe(before.records); // student records untouched
  });

  it("start-timer routine starts a timer and can be undone", () => {
    const timer = add("timer");
    S().upsertRoutine({ id: "r2", name: "Work", icon: "✍️", color: "sky", actions: [{ kind: "startTimer", minutes: 10 }, { kind: "setStatus", status: "Testing" }] });
    runRoutine("r2");
    expect((S().sessions[timer] as TimerSession).status).toBe("running");
    expect(S().widgets[timer].config.durationSec).toBe(600);
    S().undo();
    expect(S().sessions[timer]).toBeUndefined();
  });
});
