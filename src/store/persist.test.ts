import { beforeEach, describe, expect, it } from "vitest";
import { createStore, get, keys, set } from "idb-keyval";
import {
  SESSION_MAX_IDLE_MS,
  answerSessionProbes,
  applyRetention,
  currentSessionId,
  endSession,
  hasLegacyData,
  loadLegacyData,
  loadState,
  saveState,
  startSession,
} from "./persist";
import { WORKSPACE_PRESETS } from "./presets";
import { freshSession } from "./workspaceLogic";
import { persistedSnapshot } from "./store";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { buildSettingsPack, importSettingsPack } from "@/lib/exportPack";

beforeEach(() => resetStore());

describe("tab-scoped sessions", () => {
  const db = () => createStore("teacher-lesson-sidekick", "kv");
  beforeEach(async () => {
    await endSession();
    sessionStorage.clear();
  });

  it("a new visit loads nothing personal; legacy data is never read or changed", async () => {
    const legacy = { ...persistedSnapshot(), classes: [{ id: "c", name: "Old class", students: [{ id: "s", name: "Avery Brook" }], groups: [] }] };
    await set("sidekick-state", legacy, db());
    const r = await loadState();
    expect(r.state).toBeNull();
    expect(r.reason).toBe("new-visit");
    expect(await get("sidekick-state", db())).toEqual(legacy); // untouched
    expect(await hasLegacyData()).toBe(true);
    // Only an explicit restore brings it back.
    expect((await loadLegacyData())!.classes[0].students[0].name).toBe("Avery Brook");
  });

  it("restores widget order, options and records after a refresh of the same tab", async () => {
    const a = add("timer");
    const b = add("spinner");
    const c = add("choice");
    S().setWidgetOrder("ws1", [c, a, b]);
    S().updateConfig(b, { options: [{ id: "1", label: "Alpha" }, { id: "2", label: "Beta" }, { id: "3", label: "Gamma" }] });
    const cls = addClassWith("P1", ["Ana"]);
    S().addPoints(cls, { kind: "class", id: cls }, 7);
    await startSession(persistedSnapshot());
    await saveState(persistedSnapshot());

    resetStore(); // simulate the refresh
    const { state, reason } = await loadState();
    expect(reason).toBe("restored");
    // Order kept; the required CHAMPS + Voice Level are added in front (never reordering the rest).
    expect(state!.workspaces[0].widgetIds.slice(-3)).toEqual([c, a, b]);
    expect(state!.workspaces[0].widgetIds.map((id) => state!.widgets[id].type).slice(0, 2).sort()).toEqual(["champs", "voice"]);
    expect(state!.widgets[b].config.options).toHaveLength(3);
    expect(state!.records.points[cls].whole).toBe(7);
  });

  it("closing the tab (sessionStorage gone) starts fresh; a session idle for 12 hours expires", async () => {
    addClassWith("P1", ["Ana"]);
    await startSession(persistedSnapshot());
    sessionStorage.clear(); // tab closed
    expect((await loadState()).state).toBeNull();

    await startSession(persistedSnapshot());
    const later = Date.now() + SESSION_MAX_IDLE_MS + 60_000; // e.g. restored the next day
    const r = await loadState(later);
    expect(r).toMatchObject({ state: null, reason: "expired" });
  });

  it("a duplicated tab gets its own copy of the session", async () => {
    addClassWith("P1", ["Ana"]);
    const first = await startSession(persistedSnapshot());
    const stop = answerSessionProbes(); // the original tab is still open
    const r = await loadState();
    stop();
    expect(r.reason).toBe("duplicated");
    expect(r.state!.classes[0].name).toBe("P1");
    expect(currentSessionId()).not.toBe(first);
  });

  it("nothing personal is saved before a workspace is chosen", async () => {
    const before = (await keys(db())).map(String).sort();
    addClassWith("P1", ["Ana Secret"]);
    await saveState(persistedSnapshot()); // no session yet
    expect((await keys(db())).map(String).sort()).toEqual(before);
  });

  it("session-only retention never writes student names", () => {
    addClassWith("P1", ["Ana Secret"]);
    S().setPrefs({ studentDataRetention: "session" });
    const out = applyRetention(persistedSnapshot());
    expect(JSON.stringify(out)).not.toContain("Ana Secret");
    expect(out.classes[0].name).toBe("P1");
  });

  it("unreadable session data starts fresh", async () => {
    await startSession(persistedSnapshot());
    await set(`sk-session:${currentSessionId()}`, { version: 999 }, db());
    const r = await loadState();
    expect(r.state).toBeNull();
    expect(r.recovered).toMatch(/Starting fresh/);
  });
});

describe("eight presets", () => {
  it("fresh sessions contain only the chosen preset, with its widgets in order and required ones", () => {
    for (const p of WORKSPACE_PRESETS) {
      const s = freshSession(p.kind);
      expect(s.classes).toEqual([]);
      expect(s.workspaces).toHaveLength(1);
      const types = s.workspaces[0].widgetIds.map((id) => s.widgets[id].type);
      expect(types.filter((t) => t === "champs")).toHaveLength(1);
      expect(types.filter((t) => t === "voice")).toHaveLength(p.kind === "wholeGroup" ? 0 : 1);
      // Exactly the preset's widgets (required ones were already listed), with its widths and layout.
      expect([...types].sort()).toEqual(p.widgets.map((w) => w.type).sort());
      const ws = s.workspaces[0];
      expect(ws.layouts?.["7"]).toHaveLength(p.widgets.length);
      for (const seed of p.widgets) {
        const inst = ws.widgetIds.map((id) => s.widgets[id]).find((w) => w.type === seed.type && (w.title ?? null) === (seed.title ?? null))!;
        expect(inst.w ?? null).toBe(seed.w ?? null);
        expect(ws.layouts!["7"].find((pos) => pos.i === inst.id)!.x).toBe(seed.at![0]);
      }
    }
  });
  it("preset settings: Essential Teacher Tools, Testing, Stations", () => {
    const bryan = freshSession("bryan");
    const b = bryan.workspaces[0].widgetIds.map((id) => bryan.widgets[id]);
    const of = (t: string) => b.find((w) => w.type === t)!;
    // Reading order of the approved layout (top row first, left to right).
    expect(b.map((w) => w.type)).toEqual(["clock", "ican", "iwill", "champs", "voice", "timer", "picker", "hallpass", "checklist", "reward"]);
    expect(of("reward").size).toBe("S");
    expect(of("clock").config.showDate).toBe(true);
    expect(of("timer").config.durationSec).toBe(300);
    expect(of("hallpass").title).toBe("Check Out");
    const t = freshSession("testing");
    const tw = t.workspaces[0].widgetIds.map((id) => t.widgets[id]);
    expect(tw.find((w) => w.type === "status")!.config.current).toBe("Testing");
    expect(tw.find((w) => w.type === "voice")!.config).toMatchObject({ level: "silent", alertOn: false });
    expect(tw.find((w) => w.type === "timer")!.config.soundOn).toBe(false);
    const wg = freshSession("wholeGroup");
    const wgw = wg.workspaces[0].widgetIds.map((id) => wg.widgets[id]);
    expect(wgw.find((w) => w.type === "reward")!.size).toBe("S");
    const sg = freshSession("smallGroup");
    expect(sg.workspaces[0].widgetIds.map((id) => sg.widgets[id].type)).toContain("hallpass");
    const tr = freshSession("transition");
    const trw = tr.workspaces[0].widgetIds.map((id) => tr.widgets[id]);
    const trOf = (t: string) => trw.find((w) => w.type === t)!;
    expect(trw.map((w) => w.type)).toEqual(["champs", "voice", "timer", "quiz", "notes", "points"]);
    expect(trOf("champs").config.active).toBe("transitions");
    expect(trOf("voice").config.level).toBe("partner");
    expect(trOf("quiz").config).toMatchObject({ grade: "3-5", subject: "ela" });
    expect(trOf("notes").title).toBe("Student Reminders");
    expect(trw.map((w) => w.w)).toEqual([1, 2, 1, 2, 1, 2]);
    const c = freshSession("centers");
    const timer = c.workspaces[0].widgetIds.map((id) => c.widgets[id]).find((w) => w.type === "timer")!;
    expect(timer.config).toMatchObject({ durationSec: 900, stations: { enabled: true } });
  });
});

describe("settings packs", () => {
  it("never include student names or records", () => {
    addClassWith("P1", ["Zelda Quintana", "Ben"]);
    const sp = add("spinner");
    S().updateConfig(sp, { options: [{ id: "1", label: "Zelda Quintana" }, { id: "2", label: "Draw" }] });
    const n = add("notes", { text: { general: "Zelda Quintana needs a pencil" } });
    const q = add("queue");
    S().setSession(q, { queue: [{ id: "x", name: "Zelda Quintana" }], now: null });
    void n;
    const pack = buildSettingsPack(persistedSnapshot());
    const json = JSON.stringify(pack);
    expect(json).not.toContain("Zelda");
    expect(json).not.toContain("Ben\"");
    expect(json).not.toContain("records");
    expect(json).toContain("Draw");
  });

  it("imports as new independent workspaces", () => {
    add("timer");
    const pack = JSON.parse(JSON.stringify(buildSettingsPack(persistedSnapshot())));
    const r = importSettingsPack(pack);
    expect(r.workspaces).toHaveLength(1);
    expect(Object.values(r.widgets)[0].type).toBe("timer");
    expect(() => importSettingsPack({ kind: "nope" })).toThrow();
  });
});
