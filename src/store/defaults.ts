import type { DockItem, PersistedState, Preferences, QuickRoutine, WidgetInstance, WidgetType, Workspace } from "@/lib/types";
import { uid } from "@/lib/ids";
import { DEFINITIONS } from "@/widgets/definitions";

export const SCHEMA_VERSION = 1;

export const DEFAULT_PREFS: Preferences = {
  themeId: "rainbow",
  reducedMotion: "system",
  navStyle: "compact",
  dockPosition: "bottom",
  shortcutsEnabled: true,
  volume: 0.7,
  muted: false,
  studentDataRetention: "keep",
  followClassDefaultWorkspace: true,
  shortcutRoutineId: null,
  sideBySideTipDismissed: false,
};

export function makeInstance(
  type: WidgetType,
  workspaceId: string,
  overrides: Partial<Omit<WidgetInstance, "id" | "type" | "workspaceId">> = {},
): WidgetInstance {
  const def = DEFINITIONS[type];
  return {
    id: uid("w"),
    type,
    color: def.defaultColor,
    locked: false,
    collapsed: false,
    size: def.defaultSize,
    workspaceId,
    removedAt: null,
    createdAt: Date.now(),
    ...overrides,
    config: { ...def.defaultConfig(), ...(overrides.config ?? {}) },
  };
}

export function starterRoutines(): QuickRoutine[] {
  return [
    {
      id: uid("r"),
      name: "Independent Work",
      icon: "✍️",
      color: "indigo",
      actions: [
        { kind: "setStatus", status: "Independent Work" },
        { kind: "setVoiceLevel", level: "silent" },
        { kind: "startTimer", minutes: 15 },
      ],
    },
    {
      id: uid("r"),
      name: "Partner Talk",
      icon: "🗣️",
      color: "teal",
      actions: [
        { kind: "setStatus", status: "Partner Work" },
        { kind: "setVoiceLevel", level: "partner" },
        { kind: "startTimer", minutes: 3 },
        { kind: "playSound", sound: "chime" },
      ],
    },
    {
      id: uid("r"),
      name: "Cleanup",
      icon: "🧹",
      color: "orange",
      actions: [
        { kind: "playSound", sound: "attention" },
        { kind: "setVoiceLevel", level: "table" },
        { kind: "startTimer", minutes: 3 },
        { kind: "openChecklist", title: "Cleanup", items: ["Supplies away", "Trash in bin", "Chairs pushed in", "Desks clear"] },
      ],
    },
    {
      id: uid("r"),
      name: "Transition",
      icon: "🔁",
      color: "pink",
      actions: [
        { kind: "playSound", sound: "bell" },
        { kind: "setStatus", status: "Transition" },
        { kind: "setVoiceLevel", level: "silent" },
        { kind: "startTimer", minutes: 1 },
      ],
    },
  ];
}

export function createDefaultState(): PersistedState {
  const main: Workspace = { id: uid("ws"), name: "My Classroom", widgetIds: [] };
  const centers: Workspace = { id: uid("ws"), name: "Centers", widgetIds: [] };
  const widgets: Record<string, WidgetInstance> = {};
  const add = (ws: Workspace, type: WidgetType, o: Partial<WidgetInstance> = {}) => {
    const w = makeInstance(type, ws.id, o);
    widgets[w.id] = w;
    ws.widgetIds.push(w.id);
    return w;
  };
  add(main, "timer");
  add(main, "picker");
  add(main, "voice");
  add(main, "spinner");
  add(main, "notes", { config: { scope: "general", fontSize: "md", text: { general: "Welcome! Drag widgets by the ⠿ handle. Tap + to add more." } } });
  add(main, "dice");
  add(main, "clock", { config: { use24h: false, showSeconds: false, showDate: true, style: "compact" } });

  add(centers, "timer", {
    config: { durationSec: 900, stations: { enabled: true, names: ["Reading Nook", "Math Games", "Writing", "Teacher Table"] } },
  });
  add(centers, "checklist", {
    config: { title: "Center materials", items: [{ id: uid("i"), text: "Task cards out" }, { id: uid("i"), text: "Timers charged" }] },
  });
  add(centers, "groups");
  add(centers, "soundboard");

  const routines = starterRoutines();
  const timerId = main.widgetIds[0];
  const dock: DockItem[] = [
    { id: uid("d"), kind: "action", action: "timer5" },
    { id: uid("d"), kind: "action", action: "pickStudent" },
    { id: uid("d"), kind: "action", action: "classPoint" },
    { id: uid("d"), kind: "action", action: "bell" },
    { id: uid("d"), kind: "routine", routineId: routines[2].id },
    { id: uid("d"), kind: "widget", widgetId: timerId },
    { id: uid("d"), kind: "action", action: "undo" },
  ];

  return {
    version: SCHEMA_VERSION,
    prefs: { ...DEFAULT_PREFS },
    classes: [],
    activeClassId: null,
    workspaces: [main, centers],
    activeWorkspaceId: main.id,
    widgets,
    sessions: {},
    favorites: [],
    routines,
    dock,
    records: { points: {}, participation: {}, picker: {}, rewards: {} },
    recentWidgetTypes: [],
    sync: { themes: false, layouts: false, presets: false, favorites: false, notes: false, classRecords: false },
  };
}

/** Fictional demo names, for trying the app and for tests. */
export const DEMO_NAMES = [
  "Avery Brook", "Bennie Cruz", "Cam Delgado", "Dara Ellis", "Emry Fox", "Finn Garza",
  "Gia Holt", "Hollis Ibe", "Ivo Jensen", "Juno Kato", "Kai Lund", "Lumi Moreno",
  "Milo Nash", "Nova Ortiz", "Oren Park", "Pia Quinn", "Remy Sato", "Sage Tran",
];
