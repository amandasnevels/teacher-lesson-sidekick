import { create } from "zustand";
import type {
  ClassRoom,
  DockItem,
  DockItemInput,
  HallPassData,
  HallPassEntry,
  LayoutPos,
  TaughtEntry,
  Favorite,
  ParticipationData,
  PersistedState,
  PointEvent,
  PointsData,
  Preferences,
  QuickRoutine,
  Student,
  WidgetInstance,
  WidgetType,
  Workspace,
} from "@/lib/types";
import { uid } from "@/lib/ids";
import { clone } from "@/lib/clone";
import { validateNames, type ImportResult } from "@/lib/roster";
import { DEFINITIONS } from "@/widgets/definitions";
import { createDefaultState, makeInstance } from "./defaults";

/* ------------------------------------------------------------------ UI-only state */

export interface Toast {
  id: string;
  message: string;
  tone?: "info" | "success" | "warn";
  actionLabel?: string;
  onAction?: () => void;
  timeout?: number;
}

export interface UndoEntry {
  id: string;
  label: string;
  patch: Partial<PersistedState>;
}

export interface Signal {
  name: string;
  nonce: number;
  payload?: unknown;
}

export type LibraryTab = "new" | "favorites" | "removed" | "packs";
export type SettingsTab = "general" | "classes" | "workspaces" | "routines" | "dock" | "data";

interface UIState {
  hydrated: boolean;
  storageMessage: string | null;
  expandedWidgetId: string | null;
  library: { open: boolean; tab: LibraryTab };
  quickFindOpen: boolean;
  settings: { open: boolean; tab: SettingsTab };
  routineEditor: { open: boolean; routineId: string | null; mode?: "template" | "blank" | "fromCurrent" };
  toasts: Toast[];
  undoStack: UndoEntry[];
  signals: Record<string, Signal>;
  lastTimerId: string | null;
  flashWidgetId: string | null;
}

/* ------------------------------------------------------------------ helpers */

export const scopeKey = (classId: string | null, instanceId: string) => `${classId ?? "none"}:${instanceId}`;

export const emptyPoints = (): PointsData => ({ students: {}, groups: {}, whole: 0, history: [] });
export const emptyParticipation = (): ParticipationData => ({ lessonStartedAt: Date.now(), checked: [], history: [] });

type Updater<T> = T | ((prev: T) => T);
const resolve = <T,>(u: Updater<T>, prev: T): T => (typeof u === "function" ? (u as (p: T) => T)(prev) : u);

/* ------------------------------------------------------------------ actions */

interface Actions {
  hydrate(state: PersistedState, message?: string | null): void;
  replaceAll(state: PersistedState): void;

  // prefs
  setPrefs(p: Partial<Preferences>): void;
  setSync(p: Partial<PersistedState["sync"]>): void;

  // UI
  openLibrary(tab?: LibraryTab): void;
  closeLibrary(): void;
  setQuickFind(open: boolean): void;
  openSettings(tab?: SettingsTab): void;
  closeSettings(): void;
  openRoutineEditor(routineId: string | null, mode?: "template" | "blank" | "fromCurrent"): void;
  closeRoutineEditor(): void;
  expandWidget(id: string | null): void;
  flashWidget(id: string): void;
  toast(t: Omit<Toast, "id">): string;
  dismissToast(id: string): void;
  signal(widgetId: string, name: string, payload?: unknown): void;
  consumeSignal(widgetId: string): void;
  setLastTimer(id: string): void;

  // undo
  pushUndo(label: string, keys: (keyof PersistedState)[]): void;
  undo(): string | null;

  // classes & rosters
  addClass(name: string): string;
  renameClass(id: string, name: string): void;
  deleteClass(id: string): void;
  setActiveClass(id: string | null): void;
  setClassDefaultWorkspace(classId: string, workspaceId: string | null): void;
  addStudents(classId: string, names: string[]): ImportResult;
  renameStudent(classId: string, studentId: string, name: string): boolean;
  removeStudent(classId: string, studentId: string): void;
  addGroup(classId: string, name: string): string;
  renameGroup(classId: string, groupId: string, name: string): void;
  removeGroup(classId: string, groupId: string): void;
  setStudentGroup(classId: string, studentId: string, groupId: string | null): void;
  setGroupsFromAssignments(classId: string, groups: string[][]): void;
  clearAllStudentData(): void;

  // workspaces
  addWorkspace(name: string, copyFromId?: string): string;
  renameWorkspace(id: string, name: string): void;
  deleteWorkspace(id: string): void;
  setActiveWorkspace(id: string): void;
  setWidgetOrder(workspaceId: string, ids: string[]): void;
  /** Save the teacher's arrangement for one column count, and the matching reading order. */
  setWorkspaceLayout(workspaceId: string, cols: number, positions: LayoutPos[], order: string[]): void;
  /** Forget arranged positions for one column count (e.g. after a keyboard reorder). */
  clearWorkspaceLayout(workspaceId: string, cols: number): void;

  // widgets
  addWidget(type: WidgetType, opts?: Partial<WidgetInstance> & { atStart?: boolean; workspaceId?: string }): string;
  duplicateWidget(id: string): string | null;
  updateWidget(id: string, patch: Partial<Omit<WidgetInstance, "id" | "type" | "config">>): void;
  updateConfig(id: string, patch: Updater<Record<string, unknown>>): void;
  setSession<T>(id: string, value: Updater<T | undefined>): void;
  removeWidget(id: string): void;
  restoreWidget(id: string): void;
  deleteWidgetForever(id: string): void;
  copyWidgetToWorkspace(id: string, workspaceId: string): string | null;

  // favorites
  saveFavorite(widgetId: string, name: string): string | null;
  addFromFavorite(favoriteId: string): string | null;
  renameFavorite(id: string, name: string): void;
  deleteFavorite(id: string): void;

  // routines
  upsertRoutine(r: QuickRoutine): void;
  deleteRoutine(id: string): void;

  // dock
  setDock(items: DockItem[]): void;
  addDockItem(item: DockItemInput): void;
  removeDockItem(id: string): void;

  // class records
  addPoints(classId: string, target: PointEvent["target"], delta: number, category?: string): void;
  undoLastPoints(classId: string): boolean;
  resetPoints(classId: string, periodKey?: string): void;
  toggleParticipation(classId: string, studentId: string): void;
  undoParticipation(classId: string): boolean;
  resetParticipation(classId: string): void;
  setPickerDrawn(key: string, drawn: string[]): void;
  setReward(key: string, value: number): void;
  hallCheckOut(classId: string, studentId: string, destination: string, source?: "teacher" | "student"): boolean;
  hallCheckIn(classId: string, entryId: string): void;
  hallCheckInAll(classId: string): void;
  hallMarkReminded(classId: string, entryId: string): void;
  hallClearLog(classId: string): void;

  // teaching tracker
  logTaught(entries: Omit<TaughtEntry, "id" | "loggedAt">[]): number;
  removeTaught(id: string): void;
}

export type SidekickState = PersistedState & UIState & Actions;

const initialUI: UIState = {
  hydrated: false,
  storageMessage: null,
  expandedWidgetId: null,
  library: { open: false, tab: "new" },
  quickFindOpen: false,
  settings: { open: false, tab: "general" },
  routineEditor: { open: false, routineId: null },
  toasts: [],
  undoStack: [],
  signals: {},
  lastTimerId: null,
  flashWidgetId: null,
};

const UNDO_LIMIT = 30;
/** Completed trips kept per class (oldest are dropped first). */
export const HALL_LOG_LIMIT = 2000;

export const useSidekick = create<SidekickState>()((set, get) => {
  const mutateClass = (classId: string, fn: (c: ClassRoom) => ClassRoom) =>
    set((s) => ({ classes: s.classes.map((c) => (c.id === classId ? fn(c) : c)) }));

  const pointsOf = (classId: string) => get().records.points[classId] ?? emptyPoints();
  const setPointsData = (classId: string, data: PointsData) =>
    set((s) => ({ records: { ...s.records, points: { ...s.records.points, [classId]: data } } }));
  const hallOf = (classId: string): HallPassData => get().records.hallpass?.[classId] ?? { out: [], log: [] };
  const setHall = (classId: string, data: HallPassData) =>
    set((s) => ({ records: { ...s.records, hallpass: { ...(s.records.hallpass ?? {}), [classId]: data } } }));
  const partOf = (classId: string) => get().records.participation[classId] ?? emptyParticipation();
  const setPart = (classId: string, data: ParticipationData) =>
    set((s) => ({ records: { ...s.records, participation: { ...s.records.participation, [classId]: data } } }));

  return {
    ...createDefaultState(),
    ...initialUI,

    hydrate(state, message = null) {
      set({ ...state, hydrated: true, storageMessage: message });
    },
    replaceAll(state) {
      set({ ...state, expandedWidgetId: null, undoStack: [], signals: {} });
    },

    setPrefs(p) {
      set((s) => ({ prefs: { ...s.prefs, ...p } }));
    },
    setSync(p) {
      set((s) => ({ sync: { ...s.sync, ...p, classRecords: false } }));
    },

    openLibrary(tab = "new") {
      set({ library: { open: true, tab } });
    },
    closeLibrary() {
      set((s) => ({ library: { ...s.library, open: false } }));
    },
    setQuickFind(open) {
      set({ quickFindOpen: open });
    },
    openSettings(tab = "general") {
      set({ settings: { open: true, tab } });
    },
    closeSettings() {
      set((s) => ({ settings: { ...s.settings, open: false } }));
    },
    openRoutineEditor(routineId, mode) {
      set({ routineEditor: { open: true, routineId, mode } });
    },
    closeRoutineEditor() {
      set({ routineEditor: { open: false, routineId: null } });
    },
    expandWidget(id) {
      set({ expandedWidgetId: id });
    },
    flashWidget(id) {
      set({ flashWidgetId: id });
      // Bring it on screen (it may have just been added at the bottom of the workspace).
      if (typeof document !== "undefined")
        setTimeout(() => {
          const el = document.querySelector(`[data-widget-id="${id}"]`);
          const reduce = document.documentElement.classList.contains("reduce-motion");
          el?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
        }, 60);
      setTimeout(() => {
        if (get().flashWidgetId === id) set({ flashWidgetId: null });
      }, 1400);
    },
    toast(t) {
      const id = uid("t");
      set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
      return id;
    },
    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
    signal(widgetId, name, payload) {
      set((s) => ({ signals: { ...s.signals, [widgetId]: { name, payload, nonce: (s.signals[widgetId]?.nonce ?? 0) + 1 } } }));
    },
    consumeSignal(widgetId) {
      set((s) => {
        if (!s.signals[widgetId]) return {};
        const { [widgetId]: _x, ...rest } = s.signals;
        return { signals: rest };
      });
    },
    setLastTimer(id) {
      if (get().lastTimerId !== id) set({ lastTimerId: id });
    },

    pushUndo(label, keys) {
      const s = get();
      const patch: Partial<PersistedState> = {};
      for (const k of keys) (patch as Record<string, unknown>)[k] = s[k];
      set({ undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), { id: uid("u"), label, patch }] });
    },
    undo() {
      const stack = get().undoStack;
      const last = stack[stack.length - 1];
      if (!last) return null;
      set({ ...last.patch, undoStack: stack.slice(0, -1) });
      return last.label;
    },

    /* ---------------------------------------------------------- classes */
    addClass(name) {
      const c: ClassRoom = { id: uid("c"), name: name.trim() || "New class", students: [], groups: [], defaultWorkspaceId: null };
      set((s) => ({ classes: [...s.classes, c], activeClassId: s.activeClassId ?? c.id }));
      return c.id;
    },
    renameClass(id, name) {
      if (!name.trim()) return;
      mutateClass(id, (c) => ({ ...c, name: name.trim() }));
    },
    deleteClass(id) {
      set((s) => {
        const classes = s.classes.filter((c) => c.id !== id);
        const { [id]: _p, ...points } = s.records.points;
        const { [id]: _q, ...participation } = s.records.participation;
        const { [id]: _h, ...hallpass } = s.records.hallpass ?? {};
        const strip = (rec: Record<string, unknown>) =>
          Object.fromEntries(Object.entries(rec).filter(([k]) => !k.startsWith(`${id}:`)));
        return {
          classes,
          activeClassId: s.activeClassId === id ? classes[0]?.id ?? null : s.activeClassId,
          records: {
            points,
            participation,
            picker: strip(s.records.picker) as Record<string, string[]>,
            rewards: strip(s.records.rewards) as Record<string, number>,
            hallpass,
          },
        };
      });
    },
    setActiveClass(id) {
      const s = get();
      if (id === s.activeClassId) return;
      const cls = s.classes.find((c) => c.id === id);
      const patch: Partial<PersistedState> = { activeClassId: id };
      if (cls?.defaultWorkspaceId && s.prefs.followClassDefaultWorkspace && s.workspaces.some((w) => w.id === cls.defaultWorkspaceId)) {
        patch.activeWorkspaceId = cls.defaultWorkspaceId;
      }
      set(patch);
    },
    setClassDefaultWorkspace(classId, workspaceId) {
      mutateClass(classId, (c) => ({ ...c, defaultWorkspaceId: workspaceId }));
    },
    addStudents(classId, names) {
      const cls = get().classes.find((c) => c.id === classId);
      if (!cls) return { names: [], duplicates: [], invalid: [] };
      const result = validateNames(names, cls.students.map((st) => st.name));
      if (result.names.length) {
        const added: Student[] = result.names.map((name) => ({ id: uid("s"), name, groupId: null }));
        mutateClass(classId, (c) => ({ ...c, students: [...c.students, ...added] }));
      }
      return result;
    },
    renameStudent(classId, studentId, name) {
      const cls = get().classes.find((c) => c.id === classId);
      const clean = name.replace(/\s+/g, " ").trim();
      if (!cls || !clean) return false;
      if (cls.students.some((st) => st.id !== studentId && st.name.toLowerCase() === clean.toLowerCase())) return false;
      mutateClass(classId, (c) => ({ ...c, students: c.students.map((st) => (st.id === studentId ? { ...st, name: clean } : st)) }));
      return true;
    },
    removeStudent(classId, studentId) {
      get().pushUndo("Remove student", ["classes"]);
      mutateClass(classId, (c) => ({ ...c, students: c.students.filter((st) => st.id !== studentId) }));
    },
    addGroup(classId, name) {
      const id = uid("g");
      mutateClass(classId, (c) => ({ ...c, groups: [...c.groups, { id, name: name.trim() || `Table ${c.groups.length + 1}` }] }));
      return id;
    },
    renameGroup(classId, groupId, name) {
      if (!name.trim()) return;
      mutateClass(classId, (c) => ({ ...c, groups: c.groups.map((g) => (g.id === groupId ? { ...g, name: name.trim() } : g)) }));
    },
    removeGroup(classId, groupId) {
      mutateClass(classId, (c) => ({
        ...c,
        groups: c.groups.filter((g) => g.id !== groupId),
        students: c.students.map((st) => (st.groupId === groupId ? { ...st, groupId: null } : st)),
      }));
    },
    setStudentGroup(classId, studentId, groupId) {
      mutateClass(classId, (c) => ({ ...c, students: c.students.map((st) => (st.id === studentId ? { ...st, groupId } : st)) }));
    },
    setGroupsFromAssignments(classId, groups) {
      get().pushUndo("Replace table groups", ["classes"]);
      mutateClass(classId, (c) => {
        const newGroups = groups.map((_, i) => ({ id: uid("g"), name: `Group ${i + 1}` }));
        const map = new Map<string, string>();
        groups.forEach((ids, i) => ids.forEach((sid) => map.set(sid, newGroups[i].id)));
        return { ...c, groups: newGroups, students: c.students.map((st) => ({ ...st, groupId: map.get(st.id) ?? null })) };
      });
    },
    clearAllStudentData() {
      set((s) => ({
        classes: s.classes.map((c) => ({ ...c, students: [], groups: [] })),
        records: { points: {}, participation: {}, picker: {}, rewards: {}, hallpass: {} },
        undoStack: [],
      }));
    },

    /* ---------------------------------------------------------- workspaces */
    addWorkspace(name, copyFromId) {
      const id = uid("ws");
      const s = get();
      const ws: Workspace = { id, name: name.trim() || "New workspace", widgetIds: [] };
      const widgets = { ...s.widgets };
      const src = copyFromId ? s.workspaces.find((w) => w.id === copyFromId) : null;
      if (src) {
        for (const wid of src.widgetIds) {
          const orig = s.widgets[wid];
          if (!orig) continue;
          const copy: WidgetInstance = { ...clone(orig), id: uid("w"), workspaceId: id, createdAt: Date.now(), removedAt: null };
          widgets[copy.id] = copy;
          ws.widgetIds.push(copy.id);
        }
      }
      set({ workspaces: [...s.workspaces, ws], widgets, activeWorkspaceId: id });
      return id;
    },
    renameWorkspace(id, name) {
      if (!name.trim()) return;
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name: name.trim() } : w)) }));
    },
    deleteWorkspace(id) {
      const s = get();
      if (s.workspaces.length <= 1) return;
      const ws = s.workspaces.find((w) => w.id === id);
      if (!ws) return;
      const now = Date.now();
      const widgets = { ...s.widgets };
      // Its widgets become recoverable from Removed Widgets — nothing is destroyed.
      for (const wid of ws.widgetIds) if (widgets[wid]) widgets[wid] = { ...widgets[wid], removedAt: now };
      const workspaces = s.workspaces.filter((w) => w.id !== id);
      set({
        workspaces,
        widgets,
        activeWorkspaceId: s.activeWorkspaceId === id ? workspaces[0].id : s.activeWorkspaceId,
        classes: s.classes.map((c) => (c.defaultWorkspaceId === id ? { ...c, defaultWorkspaceId: null } : c)),
      });
    },
    setActiveWorkspace(id) {
      if (get().workspaces.some((w) => w.id === id)) set({ activeWorkspaceId: id, expandedWidgetId: null });
    },
    setWorkspaceLayout(workspaceId, cols, positions, order) {
      set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, widgetIds: order, layouts: { ...(w.layouts ?? {}), [String(cols)]: positions } } : w)),
      }));
    },
    clearWorkspaceLayout(workspaceId, cols) {
      set((s) => ({
        workspaces: s.workspaces.map((w) => {
          if (w.id !== workspaceId || !w.layouts?.[String(cols)]) return w;
          const { [String(cols)]: _drop, ...rest } = w.layouts;
          return { ...w, layouts: rest };
        }),
      }));
    },
    setWidgetOrder(workspaceId, ids) {
      set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, widgetIds: ids } : w)) }));
    },

    /* ---------------------------------------------------------- widgets */
    addWidget(type, opts = {}) {
      const s = get();
      const { atStart, workspaceId: wsOverride, ...overrides } = opts;
      const workspaceId = wsOverride ?? s.activeWorkspaceId;
      const inst = makeInstance(type, workspaceId, overrides);
      set({
        widgets: { ...s.widgets, [inst.id]: inst },
        workspaces: s.workspaces.map((w) =>
          w.id === workspaceId ? { ...w, widgetIds: atStart ? [inst.id, ...w.widgetIds] : [...w.widgetIds, inst.id] } : w,
        ),
        recentWidgetTypes: [type, ...s.recentWidgetTypes.filter((t) => t !== type)].slice(0, 6),
      });
      return inst.id;
    },
    duplicateWidget(id) {
      const s = get();
      const orig = s.widgets[id];
      if (!orig) return null;
      // Copy settings (config, color, size) but NOT the session: the copy starts fresh.
      const copy: WidgetInstance = {
        ...clone(orig),
        id: uid("w"),
        locked: false,
        collapsed: false,
        removedAt: null,
        createdAt: Date.now(),
      };
      set({
        widgets: { ...s.widgets, [copy.id]: copy },
        workspaces: s.workspaces.map((w) => {
          if (w.id !== orig.workspaceId) return w;
          const idx = w.widgetIds.indexOf(id);
          const ids = w.widgetIds.slice();
          ids.splice(idx >= 0 ? idx + 1 : ids.length, 0, copy.id);
          return { ...w, widgetIds: ids };
        }),
      });
      return copy.id;
    },
    updateWidget(id, patch) {
      set((s) => (s.widgets[id] ? { widgets: { ...s.widgets, [id]: { ...s.widgets[id], ...patch } } } : {}));
    },
    updateConfig(id, patch) {
      set((s) => {
        const w = s.widgets[id];
        if (!w) return {};
        const next = typeof patch === "function" ? patch(w.config) : { ...w.config, ...patch };
        return { widgets: { ...s.widgets, [id]: { ...w, config: next } } };
      });
    },
    setSession(id, value) {
      set((s) => ({ sessions: { ...s.sessions, [id]: resolve(value as Updater<unknown>, s.sessions[id]) } }));
    },
    removeWidget(id) {
      const s = get();
      const w = s.widgets[id];
      if (!w) return;
      s.pushUndo(`Remove ${DEFINITIONS[w.type].name}`, ["widgets", "workspaces"]);
      set({
        widgets: { ...s.widgets, [id]: { ...w, removedAt: Date.now() } },
        workspaces: s.workspaces.map((ws) => ({ ...ws, widgetIds: ws.widgetIds.filter((x) => x !== id) })),
        expandedWidgetId: s.expandedWidgetId === id ? null : s.expandedWidgetId,
        dock: s.dock,
      });
      get().toast({
        message: `${w.title || DEFINITIONS[w.type].name} removed`,
        actionLabel: "Undo",
        onAction: () => get().restoreWidget(id),
        timeout: 6000,
      });
    },
    restoreWidget(id) {
      const s = get();
      const w = s.widgets[id];
      if (!w) return;
      const target = s.workspaces.some((x) => x.id === w.workspaceId) && w.workspaceId === s.activeWorkspaceId ? w.workspaceId : s.activeWorkspaceId;
      set({
        widgets: { ...s.widgets, [id]: { ...w, removedAt: null, workspaceId: target } },
        workspaces: s.workspaces.map((ws) =>
          ws.id === target && !ws.widgetIds.includes(id) ? { ...ws, widgetIds: [...ws.widgetIds, id] } : ws,
        ),
      });
    },
    deleteWidgetForever(id) {
      set((s) => {
        const { [id]: _w, ...widgets } = s.widgets;
        const { [id]: _s, ...sessions } = s.sessions;
        const strip = (rec: Record<string, unknown>) => Object.fromEntries(Object.entries(rec).filter(([k]) => !k.endsWith(`:${id}`)));
        return {
          widgets,
          sessions,
          workspaces: s.workspaces.map((ws) => ({ ...ws, widgetIds: ws.widgetIds.filter((x) => x !== id) })),
          dock: s.dock.filter((d) => !(d.kind === "widget" && d.widgetId === id)),
          records: { ...s.records, picker: strip(s.records.picker) as Record<string, string[]>, rewards: strip(s.records.rewards) as Record<string, number> },
        };
      });
    },
    copyWidgetToWorkspace(id, workspaceId) {
      const s = get();
      const orig = s.widgets[id];
      if (!orig || !s.workspaces.some((w) => w.id === workspaceId)) return null;
      const copy: WidgetInstance = { ...clone(orig), id: uid("w"), workspaceId, removedAt: null, createdAt: Date.now() };
      set({
        widgets: { ...s.widgets, [copy.id]: copy },
        workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, widgetIds: [...w.widgetIds, copy.id] } : w)),
      });
      return copy.id;
    },

    /* ---------------------------------------------------------- favorites */
    saveFavorite(widgetId, name) {
      const w = get().widgets[widgetId];
      if (!w) return null;
      const def = DEFINITIONS[w.type];
      const config = clone(def.favoriteConfig ? def.favoriteConfig(w.config) : w.config);
      const fav: Favorite = {
        id: uid("f"),
        name: name.trim() || `${def.name} favorite`,
        type: w.type,
        color: w.color,
        size: w.size,
        w: w.w ?? null,
        h: w.h ?? null,
        config,
        createdAt: Date.now(),
      };
      set((s) => ({ favorites: [...s.favorites, fav] }));
      return fav.id;
    },
    addFromFavorite(favoriteId) {
      const fav = get().favorites.find((f) => f.id === favoriteId);
      if (!fav) return null;
      return get().addWidget(fav.type, { color: fav.color, size: fav.size, w: fav.w ?? null, h: fav.h ?? null, title: fav.name, config: clone(fav.config) });
    },
    renameFavorite(id, name) {
      if (!name.trim()) return;
      set((s) => ({ favorites: s.favorites.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)) }));
    },
    deleteFavorite(id) {
      set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id), dock: s.dock.filter((d) => !(d.kind === "favorite" && d.favoriteId === id)) }));
    },

    /* ---------------------------------------------------------- routines */
    upsertRoutine(r) {
      set((s) => ({ routines: s.routines.some((x) => x.id === r.id) ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] }));
    },
    deleteRoutine(id) {
      set((s) => ({
        routines: s.routines.filter((r) => r.id !== id),
        dock: s.dock.filter((d) => !(d.kind === "routine" && d.routineId === id)),
        prefs: s.prefs.shortcutRoutineId === id ? { ...s.prefs, shortcutRoutineId: null } : s.prefs,
      }));
    },

    /* ---------------------------------------------------------- dock */
    setDock(items) {
      set({ dock: items });
    },
    addDockItem(item) {
      set((s) => ({ dock: [...s.dock, { ...item, id: uid("d") } as DockItem] }));
    },
    removeDockItem(id) {
      set((s) => ({ dock: s.dock.filter((d) => d.id !== id) }));
    },

    /* ---------------------------------------------------------- class records */
    addPoints(classId, target, delta, category) {
      const p = pointsOf(classId);
      const ev: PointEvent = { id: uid("pe"), at: Date.now(), target, delta, category };
      const next: PointsData = { ...p, students: { ...p.students }, groups: { ...p.groups }, history: [...p.history.slice(-99), ev] };
      if (target.kind === "student") next.students[target.id] = (next.students[target.id] ?? 0) + delta;
      else if (target.kind === "group") next.groups[target.id] = (next.groups[target.id] ?? 0) + delta;
      else next.whole = p.whole + delta;
      setPointsData(classId, next);
    },
    undoLastPoints(classId) {
      const p = pointsOf(classId);
      const last = p.history[p.history.length - 1];
      if (!last) return false;
      const next: PointsData = { ...p, students: { ...p.students }, groups: { ...p.groups }, history: p.history.slice(0, -1) };
      if (last.target.kind === "student") next.students[last.target.id] = (next.students[last.target.id] ?? 0) - last.delta;
      else if (last.target.kind === "group") next.groups[last.target.id] = (next.groups[last.target.id] ?? 0) - last.delta;
      else next.whole -= last.delta;
      setPointsData(classId, next);
      return true;
    },
    resetPoints(classId, periodKey) {
      get().pushUndo("Reset points", ["records"]);
      setPointsData(classId, { ...emptyPoints(), periodKey });
    },
    toggleParticipation(classId, studentId) {
      const p = partOf(classId);
      const checked = p.checked.includes(studentId) ? p.checked.filter((x) => x !== studentId) : [...p.checked, studentId];
      setPart(classId, { ...p, checked, history: [...p.history.slice(-49), p.checked] });
    },
    undoParticipation(classId) {
      const p = partOf(classId);
      const prev = p.history[p.history.length - 1];
      if (!prev) return false;
      setPart(classId, { ...p, checked: prev, history: p.history.slice(0, -1) });
      return true;
    },
    resetParticipation(classId) {
      const p = partOf(classId);
      setPart(classId, { lessonStartedAt: Date.now(), checked: [], history: [...p.history.slice(-49), p.checked] });
    },
    setPickerDrawn(key, drawn) {
      set((s) => ({ records: { ...s.records, picker: { ...s.records.picker, [key]: drawn } } }));
    },
    logTaught(entries) {
      const s = get();
      const key = (e: { date: string; text: string; teksId?: string | null; classId?: string | null }) => `${e.date}|${e.teksId ?? e.text}|${e.classId ?? ""}`;
      const have = new Set(s.taught.map(key));
      const add: TaughtEntry[] = [];
      for (const e of entries) {
        if (have.has(key(e))) continue; // already logged that day for that class
        have.add(key(e));
        add.push({ ...e, id: uid("tt"), loggedAt: Date.now() });
      }
      if (add.length) {
        s.pushUndo("Log taught", ["taught"]);
        set({ taught: [...s.taught, ...add].slice(-5000) });
      }
      return add.length;
    },
    removeTaught(id) {
      get().pushUndo("Remove taught entry", ["taught"]);
      set((s) => ({ taught: s.taught.filter((t) => t.id !== id) }));
    },
    hallCheckOut(classId, studentId, destination, source = "teacher") {
      const s = get();
      const cls = s.classes.find((c) => c.id === classId);
      const st = cls?.students.find((x) => x.id === studentId);
      const hp = hallOf(classId);
      if (!st || hp.out.some((e) => e.studentId === studentId)) return false; // already out
      s.pushUndo(`Check out ${st.name}`, ["records"]);
      const entry: HallPassEntry = { id: uid("hp"), studentId, name: st.name, destination: destination.trim() || "Out", outAt: Date.now(), inAt: null, source, remindedAt: null };
      setHall(classId, { ...hp, out: [...hp.out, entry] });
      return true;
    },
    hallCheckIn(classId, entryId) {
      const hp = hallOf(classId);
      const e = hp.out.find((x) => x.id === entryId);
      if (!e) return;
      get().pushUndo(`Check in ${e.name}`, ["records"]);
      setHall(classId, { out: hp.out.filter((x) => x.id !== entryId), log: [...hp.log, { ...e, inAt: Date.now() }].slice(-HALL_LOG_LIMIT) });
    },
    hallCheckInAll(classId) {
      const hp = hallOf(classId);
      if (!hp.out.length) return;
      get().pushUndo("Check everyone in", ["records"]);
      const now = Date.now();
      setHall(classId, { out: [], log: [...hp.log, ...hp.out.map((e) => ({ ...e, inAt: now }))].slice(-HALL_LOG_LIMIT) });
    },
    hallMarkReminded(classId, entryId) {
      const hp = hallOf(classId);
      setHall(classId, { ...hp, out: hp.out.map((e) => (e.id === entryId ? { ...e, remindedAt: Date.now() } : e)) });
    },
    hallClearLog(classId) {
      get().pushUndo("Clear hall pass log", ["records"]);
      setHall(classId, { ...hallOf(classId), log: [] });
    },
    setReward(key, value) {
      set((s) => ({ records: { ...s.records, rewards: { ...s.records.rewards, [key]: Math.max(0, value) } } }));
    },
  };
});

/** Snapshot of only the persisted slice of state. */
export function persistedSnapshot(): PersistedState {
  const s = useSidekick.getState();
  return {
    version: s.version,
    prefs: s.prefs,
    classes: s.classes,
    activeClassId: s.activeClassId,
    workspaces: s.workspaces,
    activeWorkspaceId: s.activeWorkspaceId,
    widgets: s.widgets,
    sessions: s.sessions,
    favorites: s.favorites,
    routines: s.routines,
    dock: s.dock,
    records: s.records,
    recentWidgetTypes: s.recentWidgetTypes,
    sync: s.sync,
    taught: s.taught,
  };
}
