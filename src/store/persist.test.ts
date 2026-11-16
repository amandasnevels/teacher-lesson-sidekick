import { beforeEach, describe, expect, it } from "vitest";
import { set, createStore } from "idb-keyval";
import { loadState, saveState, applyRetention } from "./persist";
import { persistedSnapshot } from "./store";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { buildSettingsPack, importSettingsPack } from "@/lib/exportPack";

beforeEach(() => resetStore());

describe("persistence", () => {
  it("restores widget order, options and records after a 'refresh'", async () => {
    const a = add("timer");
    const b = add("spinner");
    const c = add("choice");
    S().setWidgetOrder("ws1", [c, a, b]);
    S().updateConfig(b, { options: [{ id: "1", label: "Alpha" }, { id: "2", label: "Beta" }, { id: "3", label: "Gamma" }] });
    const cls = addClassWith("P1", ["Ana"]);
    S().addPoints(cls, { kind: "class", id: cls }, 7);
    await saveState(persistedSnapshot());

    resetStore(); // simulate a fresh page
    const { state } = await loadState();
    // Order kept; the required CHAMPS + Voice Level are added in front (never reordering the rest).
    expect(state.workspaces[0].widgetIds.slice(-3)).toEqual([c, a, b]);
    expect(state.workspaces[0].widgetIds.map((id) => state.widgets[id].type).slice(0, 2).sort()).toEqual(["champs", "voice"]);
    expect(state.widgets[b].config.options).toHaveLength(3);
    expect(state.records.points[cls].whole).toBe(7);
  });

  it("session-only retention never writes student names", () => {
    addClassWith("P1", ["Ana Secret"]);
    S().setPrefs({ studentDataRetention: "session" });
    const out = applyRetention(persistedSnapshot());
    expect(JSON.stringify(out)).not.toContain("Ana Secret");
    expect(out.classes[0].name).toBe("P1");
  });

  it("keeps a backup and starts fresh when saved data is unreadable", async () => {
    await set("sidekick-state", { version: 999 }, createStore("teacher-lesson-sidekick", "kv"));
    const r = await loadState();
    expect(r.recovered).toMatch(/backup/);
    expect(r.state.workspaces.length).toBeGreaterThan(0);
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
