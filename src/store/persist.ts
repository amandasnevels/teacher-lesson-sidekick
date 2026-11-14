/**
 * Persistence layer.
 *  - Large data (workspaces, widgets, rosters, records…) → IndexedDB via idb-keyval.
 *  - Small prefs (theme etc.) are mirrored to localStorage so the theme applies before IDB loads.
 *  - Versioned payload with a migration hook. A payload that fails to load is backed up, never deleted.
 *  - Student data retention: when the teacher chooses "session only", rosters and class records
 *    are stripped before writing, so they never reach disk.
 */
import { get, set, createStore, type UseStore } from "idb-keyval";
import type { PersistedState } from "@/lib/types";
import { DEFAULT_PREFS, SCHEMA_VERSION, createDefaultState } from "./defaults";

const KEY = "sidekick-state";
const PREFS_KEY = "sidekick-prefs";

let idbStore: UseStore | null = null;
function store(): UseStore {
  if (!idbStore) idbStore = createStore("teacher-lesson-sidekick", "kv");
  return idbStore;
}

export const PERSISTED_KEYS: (keyof PersistedState)[] = [
  "version", "prefs", "classes", "activeClassId", "workspaces", "activeWorkspaceId", "widgets",
  "sessions", "favorites", "routines", "dock", "records", "recentWidgetTypes", "sync",
];

export function pickPersisted(s: PersistedState): PersistedState {
  const out = {} as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = s[k];
  return out as unknown as PersistedState;
}

/** Remove student data when the teacher chose session-only retention. */
export function applyRetention(s: PersistedState): PersistedState {
  if (s.prefs.studentDataRetention !== "session") return s;
  return {
    ...s,
    classes: s.classes.map((c) => ({ ...c, students: [], groups: [] })),
    records: { points: {}, participation: {}, picker: {}, rewards: {}, hallpass: {} },
  };
}

export function migrate(raw: unknown): PersistedState {
  const base = createDefaultState();
  if (!raw || typeof raw !== "object") throw new Error("Saved data is not an object");
  const r = raw as Partial<PersistedState>;
  if (typeof r.version !== "number" || r.version > SCHEMA_VERSION) throw new Error(`Unsupported data version ${String(r.version)}`);
  if (!Array.isArray(r.workspaces) || r.workspaces.length === 0 || typeof r.widgets !== "object")
    throw new Error("Saved data is missing workspaces");
  // Version 1 is current; future migrations go here, step by step.
  const merged: PersistedState = {
    ...base,
    ...r,
    version: SCHEMA_VERSION,
    prefs: { ...DEFAULT_PREFS, ...(r.prefs ?? {}) },
    records: { ...base.records, ...(r.records ?? {}) },
    sync: { ...base.sync, ...(r.sync ?? {}), classRecords: false },
    sessions: r.sessions ?? {},
  } as PersistedState;
  if (!merged.workspaces.some((w) => w.id === merged.activeWorkspaceId)) merged.activeWorkspaceId = merged.workspaces[0].id;
  if (merged.activeClassId && !merged.classes.some((c) => c.id === merged.activeClassId)) merged.activeClassId = null;
  // Drop dangling widget ids from workspace order.
  merged.workspaces = merged.workspaces.map((w) => ({
    ...w,
    widgetIds: w.widgetIds.filter((id) => merged.widgets[id] && !merged.widgets[id].removedAt),
  }));
  return merged;
}

export interface LoadResult {
  state: PersistedState;
  recovered?: string; // message when saved data could not be read
  fresh: boolean;
}

export async function loadState(): Promise<LoadResult> {
  let raw: unknown;
  try {
    raw = await get(KEY, store());
  } catch (e) {
    return { state: createDefaultState(), fresh: true, recovered: `Storage is unavailable (${(e as Error).message}). Changes won't be saved.` };
  }
  if (raw === undefined) {
    const state = createDefaultState();
    const prefs = readLocalPrefs();
    if (prefs) state.prefs = { ...state.prefs, ...prefs };
    return { state, fresh: true };
  }
  try {
    return { state: migrate(raw), fresh: false };
  } catch (e) {
    // Never destroy data we can't read: keep a backup copy for recovery.
    try {
      await set(`${KEY}-backup-${Date.now()}`, raw, store());
    } catch {
      /* ignore */
    }
    return {
      state: createDefaultState(),
      fresh: true,
      recovered: `Saved data couldn't be loaded (${(e as Error).message}). A backup copy was kept on this device.`,
    };
  }
}

export async function saveState(s: PersistedState): Promise<void> {
  const payload = applyRetention(pickPersisted(s));
  await set(KEY, payload, store());
  writeLocalPrefs(s);
}

function writeLocalPrefs(s: PersistedState) {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ themeId: s.prefs.themeId, reducedMotion: s.prefs.reducedMotion, dockPosition: s.prefs.dockPosition, navStyle: s.prefs.navStyle }),
    );
  } catch {
    /* private mode etc. */
  }
}

export function readLocalPrefs(): Partial<PersistedState["prefs"]> | null {
  try {
    const v = localStorage.getItem(PREFS_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
