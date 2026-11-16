/**
 * Teaching workspaces (HOW the teacher teaches) vs. the active class (WHO they teach).
 *
 *  - Workspaces are shared by every class. A class can get its own customization of a shared
 *    workspace ("Customize for This Class"): a hidden workspace with `baseId` + `classId`.
 *  - Leaving a workspace pauses its running timers (they are never restarted automatically).
 *  - Each workspace keeps its own Quick Dock.
 *  - CHAMPS is required in every workspace; Voice Level in every workspace except Whole Group.
 *
 * Everything here is a pure function of the persisted state, so it is easy to test.
 */
import type { DockItem, PersistedState, WidgetInstance, WidgetType, Workspace } from "@/lib/types";
import { clone } from "@/lib/clone";
import { uid } from "@/lib/ids";
import { pause, type TimerSession } from "@/widgets/timer/timerLogic";
import { createDefaultState, makeInstance } from "./defaults";

import { WORKSPACE_PRESETS, type PresetKind, type WorkspacePreset } from "./presets";

/** The built-in presets double as the "+ New workspace" templates. */
export const WORKSPACE_TEMPLATES: WorkspacePreset[] = WORKSPACE_PRESETS;
export type WorkspaceTemplate = WorkspacePreset;

/* ------------------------------------------------------------------ lookups */

export const isShared = (w: Workspace) => !w.baseId;
export const sharedWorkspaces = (s: Pick<PersistedState, "workspaces">) => s.workspaces.filter(isShared);

/** The shared workspace a (possibly class-customized) workspace belongs to. */
export function sharedIdOf(s: Pick<PersistedState, "workspaces">, wsId: string): string {
  return s.workspaces.find((w) => w.id === wsId)?.baseId ?? wsId;
}

export function overrideFor(s: Pick<PersistedState, "workspaces">, sharedId: string, classId: string | null): Workspace | undefined {
  if (!classId) return undefined;
  return s.workspaces.find((w) => w.baseId === sharedId && w.classId === classId);
}

/** The workspace actually shown for this shared workspace + class (the class's customization, if on). */
export function effectiveId(s: Pick<PersistedState, "workspaces">, sharedId: string, classId: string | null): string {
  const o = overrideFor(s, sharedId, classId);
  return o && !o.overrideOff ? o.id : sharedId;
}

/* ------------------------------------------------------------------ required widgets */

export function requiredTypes(ws: Workspace): WidgetType[] {
  return ws.kind === "wholeGroup" ? ["champs"] : ["champs", "voice"];
}

const liveOfType = (s: Pick<PersistedState, "widgets">, ws: Workspace, type: WidgetType) =>
  ws.widgetIds.filter((id) => s.widgets[id] && !s.widgets[id].removedAt && s.widgets[id].type === type);

/** True when removing this widget would leave its workspace without a required CHAMPS / Voice Level. */
export function isRequiredWidget(s: Pick<PersistedState, "widgets" | "workspaces">, widgetId: string): boolean {
  const w = s.widgets[widgetId];
  if (!w || (w.type !== "champs" && w.type !== "voice")) return false;
  const ws = s.workspaces.find((x) => x.widgetIds.includes(widgetId));
  if (!ws || !requiredTypes(ws).includes(w.type)) return false;
  return liveOfType(s, ws, w.type).length <= 1;
}

/** Add any missing required widgets (never duplicates; CHAMPS goes first, Voice Level second). */
export function ensureRequired(s: PersistedState, wsId: string): PersistedState {
  const ws = s.workspaces.find((w) => w.id === wsId);
  if (!ws) return s;
  const missing = requiredTypes(ws).filter((t) => liveOfType(s, ws, t).length === 0);
  if (!missing.length) return s;
  const widgets = { ...s.widgets };
  const added: string[] = [];
  for (const t of missing) {
    const inst = makeInstance(t, ws.id, t === "champs" ? { size: "M" } : {});
    widgets[inst.id] = inst;
    added.push(inst.id);
  }
  return {
    ...s,
    widgets,
    workspaces: s.workspaces.map((w) => (w.id === wsId ? { ...w, widgetIds: [...added, ...w.widgetIds] } : w)),
  };
}

export function ensureAllRequired(s: PersistedState): PersistedState {
  return s.workspaces.reduce((acc, w) => ensureRequired(acc, w.id), s);
}

/* ------------------------------------------------------------------ switching */

/** Pause every running timer in a workspace, keeping its remaining time. */
export function pauseTimersIn(s: PersistedState, wsId: string, now: number): PersistedState["sessions"] {
  const ws = s.workspaces.find((w) => w.id === wsId);
  if (!ws) return s.sessions;
  let sessions = s.sessions;
  for (const id of ws.widgetIds) {
    if (s.widgets[id]?.type !== "timer") continue;
    const sess = sessions[id] as TimerSession | undefined;
    if (sess?.status === "running") {
      if (sessions === s.sessions) sessions = { ...s.sessions };
      sessions[id] = pause(sess, now);
    }
  }
  return sessions;
}

/**
 * Move to another workspace: pause timers in the one we leave, keep each workspace's own Quick
 * Dock, and remember it as the active class's last-used workspace.
 */
export function switchTo(s: PersistedState, targetId: string, now = Date.now()): PersistedState {
  if (!s.workspaces.some((w) => w.id === targetId)) return s;
  const fromId = s.activeWorkspaceId;
  const sharedTarget = sharedIdOf(s, targetId);
  const classes = s.activeClassId
    ? s.classes.map((c) => (c.id === s.activeClassId && c.lastWorkspaceId !== sharedTarget ? { ...c, lastWorkspaceId: sharedTarget } : c))
    : s.classes;
  if (fromId === targetId) return classes === s.classes ? s : { ...s, classes };
  const target = s.workspaces.find((w) => w.id === targetId)!;
  const dock: DockItem[] = target.dock ? target.dock : s.dock;
  return {
    ...s,
    classes,
    sessions: pauseTimersIn(s, fromId, now),
    workspaces: s.workspaces.map((w) => (w.id === fromId ? { ...w, dock: s.dock } : w.id === targetId ? { ...w, dock } : w)),
    dock,
    activeWorkspaceId: targetId,
  };
}

/** Copy a workspace's widgets (settings, layout and size; never running state or student records). */
function copyWidgets(s: PersistedState, src: Workspace, newWsId: string) {
  const widgets = { ...s.widgets };
  const idMap = new Map<string, string>();
  const ids: string[] = [];
  for (const wid of src.widgetIds) {
    const orig = s.widgets[wid];
    if (!orig || orig.removedAt) continue;
    const copy: WidgetInstance = { ...clone(orig), id: uid("w"), workspaceId: newWsId, createdAt: Date.now(), removedAt: null };
    widgets[copy.id] = copy;
    idMap.set(wid, copy.id);
    ids.push(copy.id);
  }
  const layouts = src.layouts
    ? Object.fromEntries(Object.entries(src.layouts).map(([k, v]) => [k, v.filter((p) => idMap.has(p.i)).map((p) => ({ ...p, i: idMap.get(p.i)! }))]))
    : undefined;
  const dock = src.dock?.map((d) => (d.kind === "widget" && idMap.has(d.widgetId) ? { ...d, id: uid("d"), widgetId: idMap.get(d.widgetId)! } : { ...d, id: uid("d") }));
  return { widgets, ids, layouts, dock, idMap };
}

export type NewWorkspaceChoice =
  | { mode: "template"; kind: PresetKind; name: string }
  | { mode: "duplicate"; fromId: string; name: string }
  | { mode: "blank"; name: string };

/** Create a teaching workspace (template / duplicate / blank) and switch to it. */
export function createWorkspace(s: PersistedState, choice: NewWorkspaceChoice): { state: PersistedState; id: string } {
  const id = uid("ws");
  const name = choice.name.trim() || "New workspace";
  let ws: Workspace = { id, name, widgetIds: [], kind: "custom" };
  let widgets = s.widgets;
  if (choice.mode === "template") {
    const t = WORKSPACE_TEMPLATES.find((x) => x.kind === choice.kind)!;
    ws = { ...ws, kind: t.kind };
    widgets = { ...s.widgets };
    for (const seed of t.widgets) {
      const inst = makeInstance(seed.type, id, {
        ...(seed.config ? { config: seed.config } : {}),
        ...(seed.title ? { title: seed.title } : {}),
        ...(seed.size ? { size: seed.size } : {}),
      });
      widgets[inst.id] = inst;
      ws.widgetIds.push(inst.id);
    }
  } else if (choice.mode === "duplicate") {
    const src = s.workspaces.find((w) => w.id === choice.fromId);
    if (src) {
      const c = copyWidgets(s, src, id);
      widgets = c.widgets;
      ws = { ...ws, kind: src.kind ?? "custom", widgetIds: c.ids, layouts: c.layouts, dock: src.id === s.activeWorkspaceId ? clone(s.dock) : c.dock };
    }
  }
  let next: PersistedState = { ...s, widgets, workspaces: [...s.workspaces, ws] };
  next = ensureRequired(next, id);
  return { state: switchTo(next, id), id };
}

/* ------------------------------------------------------------------ class customizations */

/**
 * Turn on "Customize for This Class" for the shared workspace: re-use the class's saved
 * customization if there is one, otherwise copy the shared workspace once. The shared workspace
 * itself is never changed. The class's own progress on widgets (picker draws, reward progress)
 * moves along with it so student records are not duplicated.
 */
export function customizeForClass(s: PersistedState, sharedId: string, classId: string): PersistedState {
  const base = s.workspaces.find((w) => w.id === sharedId && isShared(w));
  if (!base) return s;
  const existing = overrideFor(s, sharedId, classId);
  if (existing) {
    const next = { ...s, workspaces: s.workspaces.map((w) => (w.id === existing.id ? { ...w, overrideOff: false } : w)) };
    return switchTo(next, existing.id);
  }
  const id = uid("ws");
  const c = copyWidgets(s, base, id);
  const ws: Workspace = {
    id,
    name: base.name,
    kind: base.kind,
    baseId: base.id,
    classId,
    widgetIds: c.ids,
    layouts: c.layouts,
    dock: base.id === s.activeWorkspaceId ? clone(s.dock) : c.dock,
  };
  const moveKeys = (rec: Record<string, unknown>) => {
    const out = { ...rec };
    for (const [from, to] of c.idMap) {
      const k = `${classId}:${from}`;
      if (k in out) out[`${classId}:${to}`] = out[k];
    }
    return out;
  };
  const records = {
    ...s.records,
    picker: moveKeys(s.records.picker) as Record<string, string[]>,
    rewards: moveKeys(s.records.rewards) as Record<string, number>,
  };
  return switchTo({ ...s, widgets: c.widgets, records, workspaces: [...s.workspaces, ws] }, id);
}

/** Go back to the shared workspace for this class (the customization is kept, switched off). */
export function useSharedForClass(s: PersistedState, sharedId: string, classId: string): PersistedState {
  const o = overrideFor(s, sharedId, classId);
  if (!o) return s;
  const next = { ...s, workspaces: s.workspaces.map((w) => (w.id === o.id ? { ...w, overrideOff: true } : w)) };
  return switchTo(next, sharedId);
}

/** Change the active class. The workspace stays the same (shown with the new class's customization, if any). */
export function changeClass(s: PersistedState, classId: string | null): PersistedState {
  if (classId === s.activeClassId) return s;
  const sharedNow = sharedIdOf(s, s.activeWorkspaceId);
  // Remember where the class we are leaving was working.
  const classes = s.classes.map((c) => (c.id === s.activeClassId ? { ...c, lastWorkspaceId: sharedNow } : c));
  const next: PersistedState = { ...s, classes, activeClassId: classId };
  const target = effectiveId(next, sharedNow, classId);
  if (target === s.activeWorkspaceId) return next;
  // Switching away from the old class's customization: don't record it as the new class's last-used.
  const switched = switchTo({ ...next, activeClassId: null }, target);
  return { ...switched, activeClassId: classId };
}

/* ------------------------------------------------------------------ fresh sessions */

/**
 * A brand-new teaching session containing only the chosen preset: no classes, students, notes or
 * records. Device preferences (theme, sound) are kept. Starter routines and Quick Dock actions are
 * product defaults, not personal data.
 */
export function freshSession(kind: PresetKind, prefs?: Partial<PersistedState["prefs"]>): PersistedState {
  const base = createDefaultState();
  const preset = WORKSPACE_PRESETS.find((p) => p.kind === kind) ?? WORKSPACE_PRESETS[WORKSPACE_PRESETS.length - 1];
  const empty: PersistedState = {
    ...base,
    prefs: { ...base.prefs, ...(prefs ?? {}) },
    workspaces: [],
    widgets: {},
    activeWorkspaceId: "",
    dock: base.dock.filter((d) => d.kind !== "widget"),
  };
  return createWorkspace(empty, { mode: "template", kind: preset.kind, name: preset.name }).state;
}

/** During a session: open the workspace made from this preset, or make it (never duplicates). */
export function openPreset(s: PersistedState, kind: PresetKind): { state: PersistedState; id: string } {
  const existing = s.workspaces.find((w) => isShared(w) && w.kind === kind);
  if (existing) return { state: switchTo(s, effectiveId(s, existing.id, s.activeClassId)), id: existing.id };
  const preset = WORKSPACE_PRESETS.find((p) => p.kind === kind)!;
  return createWorkspace(s, { mode: "template", kind, name: preset.name });
}
