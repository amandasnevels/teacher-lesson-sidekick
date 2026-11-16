/**
 * Persistence layer.
 *  - Large data (workspaces, widgets, rosters, records…) → IndexedDB via idb-keyval.
 *  - Small prefs (theme etc.) are mirrored to localStorage so the theme applies before IDB loads.
 *  - Versioned payload with a migration hook. A payload that fails to load is backed up, never deleted.
 *  - Student data retention: when the teacher chooses "session only", rosters and class records
 *    are stripped before writing, so they never reach disk.
 */
import { createStore, del, delMany, get, getMany, keys, set, type UseStore } from "idb-keyval";
import type { PersistedState } from "@/lib/types";
import { DEFAULT_PREFS, SCHEMA_VERSION, createDefaultState } from "./defaults";
import { ensureAllRequired } from "./workspaceLogic";

const KEY = "sidekick-state";
const PREFS_KEY = "sidekick-prefs";

let idbStore: UseStore | null = null;
function store(): UseStore {
  if (!idbStore) idbStore = createStore("teacher-lesson-sidekick", "kv");
  return idbStore;
}

export const PERSISTED_KEYS: (keyof PersistedState)[] = [
  "version", "prefs", "classes", "activeClassId", "workspaces", "activeWorkspaceId", "widgets",
  "sessions", "favorites", "routines", "dock", "records", "recentWidgetTypes", "sync", "taught",
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
    records: { points: {}, participation: {}, picker: {}, rewards: {}, hallpass: {}, mastery: {} },
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
  // Class customizations whose class or shared workspace is gone are dropped from the list.
  merged.workspaces = merged.workspaces.filter((w) => !w.baseId || (merged.workspaces.some((b) => b.id === w.baseId) && merged.classes.some((c) => c.id === w.classId)));
  if (!merged.workspaces.some((w) => w.id === merged.activeWorkspaceId)) merged.activeWorkspaceId = merged.workspaces.find((w) => !w.baseId)!.id;
  // Every workspace gets its required CHAMPS (and Voice Level, except Whole Group). Adds only; nothing is moved or removed.
  return ensureAllRequired(merged);
}

/* ------------------------------------------------------------------ tab-scoped sessions
 *
 * Personal teaching data (rosters, selected class/workspace, layouts, notes, points, timers…)
 * belongs to ONE browser tab session:
 *  - The session id lives in sessionStorage, which survives a normal refresh of that tab and is
 *    discarded when the tab is closed. A brand-new visit therefore has no id and starts fresh.
 *  - The data itself is written to IndexedDB under that id (sessionStorage is too small for
 *    uploaded pictures). Session records left behind by closed tabs are never loaded by a new
 *    visit, and are deleted after SESSION_MAX_IDLE_MS of inactivity.
 *  - Browsers can bring a closed tab back (Ctrl+Shift+T, "continue where you left off") together
 *    with its sessionStorage. A restored session is accepted only if it was active within
 *    SESSION_MAX_IDLE_MS; older ones start fresh. A duplicated tab gets its own copy.
 *
 * Data saved by earlier versions ("sidekick-state") is never read automatically, never changed
 * and never deleted except through the explicit buttons in Settings → Data.
 */
const SID_KEY = "sidekick-session-id";
const RECLAIM_KEY = "sidekick-reclaim";
const SESSION_PREFIX = "sk-session:";
const META_PREFIX = "sk-meta:";
/** A session idle for longer than this (e.g. restored the next day) starts fresh instead. */
export const SESSION_MAX_IDLE_MS = 12 * 60 * 60 * 1000;
export const LEGACY_KEY = KEY;

let sid: string | null = null;
export const currentSessionId = () => sid;

function readSid(): string | null {
  try {
    return sessionStorage.getItem(SID_KEY);
  } catch {
    return null;
  }
}
function writeSid(v: string | null) {
  try {
    if (v) sessionStorage.setItem(SID_KEY, v);
    else sessionStorage.removeItem(SID_KEY);
  } catch {
    /* storage blocked: the session lives only in memory */
  }
}
const newSid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Ask other open windows whether they are using this session right now (duplicated tab). */
function sessionInUseElsewhere(id: string, waitMs = 250): Promise<boolean> {
  if (typeof BroadcastChannel === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const ch = new BroadcastChannel("sidekick-sessions");
    const done = (v: boolean) => {
      ch.close();
      resolve(v);
    };
    const t = setTimeout(() => done(false), waitMs);
    ch.onmessage = (e: MessageEvent<{ type: string; sid: string }>) => {
      if (e.data?.type === "alive" && e.data.sid === id) {
        clearTimeout(t);
        done(true);
      }
    };
    ch.postMessage({ type: "probe", sid: id });
  });
}

/** Answer "is anyone using session X?" for as long as this page is open. */
export function answerSessionProbes(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel("sidekick-sessions");
  ch.onmessage = (e: MessageEvent<{ type: string; sid: string }>) => {
    if (e.data?.type === "probe" && sid && e.data.sid === sid) ch.postMessage({ type: "alive", sid });
  };
  return () => ch.close();
}

export interface LoadResult {
  /** null = no session for this tab yet: show the workspace chooser. */
  state: PersistedState | null;
  recovered?: string;
  /** Why we started fresh, for tests and diagnostics. */
  reason: "restored" | "new-visit" | "expired" | "duplicated" | "handoff" | "unreadable";
}

/** Find (or fork) this tab's session. Never touches legacy data. */
export async function loadState(now = Date.now()): Promise<LoadResult> {
  const url = new URL(window.location.href);
  const handoff = url.searchParams.get("session");
  if (handoff) {
    // A pop-out window continues the session of the window that opened it.
    url.searchParams.delete("session");
    window.history.replaceState(null, "", url.toString());
    writeSid(handoff);
  }
  let reclaim = false;
  try {
    reclaim = sessionStorage.getItem(RECLAIM_KEY) === "1";
    sessionStorage.removeItem(RECLAIM_KEY);
  } catch {
    /* ignore */
  }
  let id = readSid();
  let reason: LoadResult["reason"] = handoff ? "handoff" : "restored";
  void cleanupOldSessions(now, id);
  if (!id) return { state: null, reason: "new-visit" };

  let record: PersistedState | undefined;
  let savedAt: number | undefined;
  try {
    [record, savedAt] = await Promise.all([get<PersistedState>(SESSION_PREFIX + id, store()), get<number>(META_PREFIX + id, store())]);
  } catch (e) {
    return { state: null, reason: "unreadable", recovered: `Storage is unavailable (${(e as Error).message}). Changes won't be saved.` };
  }
  if (!record || !savedAt || now - savedAt > SESSION_MAX_IDLE_MS) {
    writeSid(null);
    if (record) void forgetSession(id);
    return { state: null, reason: record ? "expired" : "new-visit" };
  }
  // A duplicated tab copies sessionStorage: give the copy its own session so the two tabs
  // can't overwrite each other.
  if (!handoff && !reclaim && (await sessionInUseElsewhere(id))) {
    const copy = newSid();
    await Promise.all([set(SESSION_PREFIX + copy, record, store()), set(META_PREFIX + copy, now, store())]);
    writeSid(copy);
    id = copy;
    reason = "duplicated";
  }
  try {
    const state = migrate(record);
    sid = id;
    return { state, reason };
  } catch (e) {
    writeSid(null);
    return { state: null, reason: "unreadable", recovered: `This session couldn't be loaded (${(e as Error).message}). Starting fresh.` };
  }
}

/** Begin a new session for this tab (after a preset is chosen) and save it. */
export async function startSession(state: PersistedState): Promise<string> {
  sid = newSid();
  writeSid(sid);
  await saveState(state);
  return sid;
}

/** End this tab's session: its data is deleted and the next load shows the chooser. */
export async function endSession(): Promise<void> {
  const id = sid ?? readSid();
  sid = null;
  writeSid(null);
  if (id) await forgetSession(id);
}

/** The next load of this tab takes the session back from another window (pop-out). */
export function markReclaim() {
  try {
    sessionStorage.setItem(RECLAIM_KEY, "1");
  } catch {
    /* ignore */
  }
}

async function forgetSession(id: string) {
  try {
    await delMany([SESSION_PREFIX + id, META_PREFIX + id], store());
  } catch {
    /* ignore */
  }
}

/** Delete session records that have been idle too long (closed tabs). Legacy data is untouched. */
export async function cleanupOldSessions(now = Date.now(), keep: string | null = null) {
  try {
    const all = (await keys<string>(store())).filter((k) => typeof k === "string" && k.startsWith(META_PREFIX));
    if (!all.length) return;
    const stamps = await getMany<number>(all, store());
    const stale = all.filter((k, i) => k.slice(META_PREFIX.length) !== keep && now - (stamps[i] ?? 0) > SESSION_MAX_IDLE_MS).map((k) => k.slice(META_PREFIX.length));
    if (stale.length) await delMany(stale.flatMap((id) => [SESSION_PREFIX + id, META_PREFIX + id]), store());
  } catch {
    /* best effort */
  }
}

export async function saveState(s: PersistedState): Promise<void> {
  writeLocalPrefs(s);
  if (!sid) return; // nothing personal is saved before a workspace is chosen
  const payload = applyRetention(pickPersisted(s));
  await Promise.all([set(SESSION_PREFIX + sid, payload, store()), set(META_PREFIX + sid, Date.now(), store())]);
}

/* ------------------------------------------------------------------ legacy data (before sessions) */

export async function hasLegacyData(): Promise<boolean> {
  try {
    return (await get(LEGACY_KEY, store())) !== undefined;
  } catch {
    return false;
  }
}

/** Explicit, teacher-chosen: read the data saved by earlier versions into this session. */
export async function loadLegacyData(): Promise<PersistedState | null> {
  const raw = await get(LEGACY_KEY, store());
  return raw === undefined ? null : migrate(raw);
}

/** Explicit, teacher-chosen and confirmed: remove the data saved by earlier versions. */
export async function deleteLegacyData(): Promise<void> {
  await del(LEGACY_KEY, store());
}

/* ------------------------------------------------------------------ device preferences */

/** Theme, sound and layout choices are device settings (not personal data) and carry over. */
const DEVICE_PREFS = [
  "themeId", "reducedMotion", "dockPosition", "navStyle", "volume", "muted", "shortcutsEnabled", "sideBySideTipDismissed", "walkthroughDone",
] as const;

function writeLocalPrefs(s: PersistedState) {
  try {
    const out: Record<string, unknown> = {};
    for (const k of DEVICE_PREFS) out[k] = s.prefs[k as keyof typeof s.prefs];
    localStorage.setItem(PREFS_KEY, JSON.stringify(out));
  } catch {
    /* private mode etc. */
  }
}

export function readLocalPrefs(): Partial<PersistedState["prefs"]> | null {
  try {
    const v = localStorage.getItem(PREFS_KEY);
    if (!v) return null;
    const raw = JSON.parse(v) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of DEVICE_PREFS) if (k in raw) out[k] = raw[k];
    return out as Partial<PersistedState["prefs"]>;
  } catch {
    return null;
  }
}
