import { beforeEach, describe, expect, it } from "vitest";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { startTimerFor } from "./actions";
import type { TimerSession } from "@/widgets/timer/timerLogic";
import { WORKSPACE_TEMPLATES, isRequiredWidget } from "./workspaceLogic";
import { DEFINITIONS } from "@/widgets/definitions";

beforeEach(() => resetStore());
const typesIn = (wsId: string) => S().workspaces.find((w) => w.id === wsId)!.widgetIds.map((id) => S().widgets[id].type);

describe("teaching workspaces", () => {
  it("templates only use widgets that exist, always with CHAMPS; Voice Level everywhere but Whole Group", () => {
    for (const t of WORKSPACE_TEMPLATES) {
      for (const w of t.widgets) expect(DEFINITIONS[w.type]).toBeDefined();
      const id = S().createWorkspace({ mode: "template", kind: t.kind, name: t.name });
      const types = typesIn(id);
      expect(types.filter((x) => x === "champs")).toHaveLength(1);
      expect(types.filter((x) => x === "voice")).toHaveLength(t.kind === "wholeGroup" ? 0 : 1);
    }
  });

  it("blank workspaces get just CHAMPS + Voice Level; duplicates copy widgets but not running state", () => {
    const blank = S().createWorkspace({ mode: "blank", name: "Blank" });
    expect(typesIn(blank).sort()).toEqual(["champs", "voice"]);
    S().setActiveWorkspace("ws1");
    const t = startTimerFor(60);
    const dup = S().createWorkspace({ mode: "duplicate", fromId: "ws1", name: "Copy" });
    const copyTimer = S().workspaces.find((w) => w.id === dup)!.widgetIds.find((id) => S().widgets[id].type === "timer")!;
    expect(copyTimer).not.toBe(t);
    expect(S().sessions[copyTimer]).toBeUndefined();
  });

  it("required CHAMPS / Voice Level can't be removed, but extra copies can", () => {
    const id = S().createWorkspace({ mode: "template", kind: "centers", name: "C" });
    const champs = S().workspaces.find((w) => w.id === id)!.widgetIds.find((x) => S().widgets[x].type === "champs")!;
    expect(isRequiredWidget(S(), champs)).toBe(true);
    S().removeWidget(champs);
    expect(S().widgets[champs].removedAt).toBeFalsy();
    const extra = add("champs");
    S().removeWidget(extra);
    expect(S().widgets[extra].removedAt).toBeTruthy();
    const wg = S().createWorkspace({ mode: "template", kind: "wholeGroup", name: "WG" });
    const v = add("voice");
    expect(isRequiredWidget(S(), v)).toBe(false); // optional in Whole Group
    expect(wg).toBeTruthy();
  });

  it("leaving a workspace pauses its running timers; returning never restarts them", () => {
    const t = startTimerFor(120);
    const other = S().createWorkspace({ mode: "blank", name: "Other" });
    const s = S().sessions[t] as TimerSession;
    expect(s.status).toBe("paused");
    expect(s.remainingMs).toBeGreaterThan(119_000);
    S().setActiveWorkspace("ws1");
    expect((S().sessions[t] as TimerSession).status).toBe("paused");
    expect(other).toBeTruthy();
  });

  it("changing classes doesn't pause timers or move to another workspace", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    const c2 = addClassWith("P2", ["Ben"]);
    S().setActiveClass(c1);
    const t = startTimerFor(60);
    S().setActiveClass(c2);
    expect(S().activeWorkspaceId).toBe("ws1");
    expect((S().sessions[t] as TimerSession).status).toBe("running");
  });

  it("each workspace keeps its own Quick Dock", () => {
    S().addDockItem({ kind: "action", action: "bell" });
    const other = S().createWorkspace({ mode: "blank", name: "Other" });
    S().setDock([]);
    S().setActiveWorkspace("ws1");
    expect(S().dock.map((d) => d.kind === "action" && d.action)).toEqual(["bell"]);
    S().setActiveWorkspace(other);
    expect(S().dock).toEqual([]);
  });

  it("Customize for This Class: separate copy per class, shared workspace untouched, can switch back", () => {
    const c1 = addClassWith("P1", ["Ana"]);
    const c2 = addClassWith("P2", ["Ben"]);
    const shared = add("notes");
    S().setActiveClass(c1);
    S().setCustomizeForClass(true);
    const custom = S().activeWorkspaceId;
    expect(custom).not.toBe("ws1");
    const myNotes = S().workspaces.find((w) => w.id === custom)!.widgetIds.find((id) => S().widgets[id].type === "notes")!;
    S().updateConfig(myNotes, { fontSize: "lg" });
    expect(S().widgets[shared].config.fontSize).not.toBe("lg");
    // Other class sees the shared workspace.
    S().setActiveClass(c2);
    expect(S().activeWorkspaceId).toBe("ws1");
    // Back to P1 → its customization comes back.
    S().setActiveClass(c1);
    expect(S().activeWorkspaceId).toBe(custom);
    // Customizations never show up as their own workspace in lists.
    expect(S().workspaces.filter((w) => !w.baseId)).toHaveLength(1);
    // Return to shared; turning it on again restores the same customization (no extra copies).
    S().setCustomizeForClass(false);
    expect(S().activeWorkspaceId).toBe("ws1");
    S().setCustomizeForClass(true);
    expect(S().activeWorkspaceId).toBe(custom);
    expect(S().workspaces).toHaveLength(2);
  });
});
