import { beforeEach, describe, expect, it } from "vitest";
import { addClassWith, resetStore, S } from "@/test-utils";
import { buildSettingsPack } from "@/lib/exportPack";
import { persistedSnapshot } from "./store";
import { freshSession } from "./workspaceLogic";
import { mergeSetup, sessionFromSetup } from "./accountActions";

beforeEach(() => resetStore());

describe("saved setups (accounts)", () => {
  it("a saved setup reopens with the same workspaces, kinds and layout — and no student data", () => {
    const s = freshSession("bryan");
    S().replaceAll(s);
    addClassWith("Period 1", ["Avery Brook", "Bennie Cruz"]);
    const pack = buildSettingsPack(persistedSnapshot());
    const json = JSON.stringify(pack);
    expect(json).not.toContain("Avery");
    expect(json).not.toContain("Period 1");

    const back = sessionFromSetup(JSON.parse(json), S().prefs);
    expect(back.classes).toEqual([]);
    const ws = back.workspaces[0];
    expect(ws.name).toBe("Essential Teacher Tools");
    expect(ws.kind).toBe("bryan");
    const orig = s.workspaces[0];
    const types = (st: typeof s, ids: string[]) => ids.map((id) => st.widgets[id].type);
    expect(types(back, ws.widgetIds)).toEqual(types(s, orig.widgetIds));
    // Same columns as the original layout, widget by widget.
    const xs = (st: typeof s, w: typeof ws) => w.widgetIds.map((id) => w.layouts!["7"].find((p) => p.i === id)!.x);
    expect(xs(back, ws)).toEqual(xs(s, orig));
  });

  it("merging during a session adds workspaces without touching classes", () => {
    S().replaceAll(freshSession("testing"));
    const pack = buildSettingsPack(persistedSnapshot());
    const c = addClassWith("P2", ["Cam Delgado"]);
    const merged = mergeSetup(persistedSnapshot(), pack);
    expect(merged.workspaces).toHaveLength(2);
    expect(merged.classes.map((x) => x.id)).toEqual([c]);
  });
});
