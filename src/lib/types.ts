/**
 * Teacher Lesson Sidekick — core data model.
 *
 * The model deliberately separates:
 *  - Preferences            (small, per-teacher settings)
 *  - ClassRoom / Student    (ONE authoritative roster per class)
 *  - Workspace              (which widgets appear, and in what order)
 *  - WidgetDefinition       (code-level registry; never persisted)
 *  - WidgetInstance         (a placed widget: id, type, color, lock, size, config)
 *  - WidgetSession          (transient running state of an instance; NOT copied on duplicate)
 *  - Favorite               (saved configuration, used to create new independent instances)
 *  - QuickRoutine           (a named list of actions to execute)
 *  - ClassRecords           (class-specific student data: points, participation, picks, rewards)
 *  - SyncPreferences        (future selective sync choices; nothing is synced today)
 */

export type WidgetType =
  | "timer"
  | "clock"
  | "roster"
  | "picker"
  | "points"
  | "participation"
  | "notes"
  | "checklist"
  | "dice"
  | "spinner"
  | "choice"
  | "coin"
  | "soundboard"
  | "voice"
  | "tally"
  | "reward"
  | "groups"
  | "queue"
  | "status"
  | "cues"
  | "schedule"
  | "reminders"
  | "quiz"
  | "fastfacts"
  | "hallpass"
  | "ican"
  | "iwill";

export type WidgetSize = "S" | "M" | "L";

export type ThemeId =
  | "rainbow"
  | "bold"
  | "pastel"
  | "sunshine"
  | "autumn"
  | "winter"
  | "spring"
  | "dark";

export type DockPosition = "top" | "bottom" | "left" | "right";
export type NavStyle = "compact" | "tabs";

export type SoundId = "bell" | "chime" | "ding" | "applause" | "attention";

export type VoiceLevel = "silent" | "whisper" | "partner" | "table" | "presentation";

export interface Preferences {
  themeId: ThemeId;
  reducedMotion: "system" | "on" | "off";
  navStyle: NavStyle;
  dockPosition: DockPosition;
  shortcutsEnabled: boolean;
  volume: number; // 0..1
  muted: boolean;
  /** "keep": rosters + class records saved on this device. "session": kept only until the tab closes. */
  studentDataRetention: "keep" | "session";
  /** When switching classes, also switch to that class's default workspace (if one is set). */
  followClassDefaultWorkspace: boolean;
  /** Routine triggered by the "run selected routine" shortcut. */
  shortcutRoutineId: string | null;
  /** The “keep Sidekick beside your lesson” guide was dismissed. */
  sideBySideTipDismissed: boolean;
}

export interface Student {
  id: string;
  name: string;
  groupId?: string | null;
}

export interface StudentGroup {
  id: string;
  name: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  students: Student[];
  groups: StudentGroup[];
  defaultWorkspaceId?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  /** Ordered list of visible widget instance ids. */
  widgetIds: string[];
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  title?: string;
  color: string; // a palette key, see lib/colors.ts
  locked: boolean;
  collapsed: boolean;
  size: WidgetSize; // legacy preset, used when `w` is not set
  /** Preferred width in grid columns (1–4). Never overwritten by responsive layout. */
  w?: number | null;
  /** Preferred card height in px; null/undefined = fit content. */
  h?: number | null;
  workspaceId: string;
  /** Set when removed from the workspace. The instance & its data are preserved. */
  removedAt?: number | null;
  config: Record<string, unknown>;
  createdAt: number;
}

export interface Favorite {
  id: string;
  name: string;
  type: WidgetType;
  color: string;
  size: WidgetSize;
  w?: number | null;
  h?: number | null;
  config: Record<string, unknown>;
  createdAt: number;
}

export type RoutineAction =
  | { kind: "startTimer"; minutes: number }
  | { kind: "setVoiceLevel"; level: VoiceLevel }
  | { kind: "setStatus"; status: string }
  | { kind: "showWidget"; widgetType: WidgetType }
  | { kind: "hideWidget"; widgetType: WidgetType }
  | { kind: "openChecklist"; title: string; items: string[] }
  | { kind: "playSound"; sound: SoundId }
  | { kind: "resetWidget"; widgetType: TemporaryWidgetType }
  | { kind: "switchWorkspace"; workspaceId: string };

/** Widgets whose state is temporary and safe to reset from a routine (never student records). */
export type TemporaryWidgetType = "timer" | "tally" | "choice" | "queue" | "dice" | "coin" | "spinner";

export interface QuickRoutine {
  id: string;
  name: string;
  icon: string; // emoji
  color: string;
  actions: RoutineAction[];
}

export type DockActionId =
  | "timer1"
  | "timer3"
  | "timer5"
  | "timer10"
  | "pickStudent"
  | "classPoint"
  | "bell"
  | "attention"
  | "rollDice"
  | "flipCoin"
  | "undo";

export type DockItem =
  | { id: string; kind: "widget"; widgetId: string }
  | { id: string; kind: "favorite"; favoriteId: string }
  | { id: string; kind: "action"; action: DockActionId }
  | { id: string; kind: "routine"; routineId: string };

export type DockItemInput = DockItem extends infer T ? (T extends DockItem ? Omit<T, "id"> : never) : never;

export interface PointEvent {
  id: string;
  at: number;
  target: { kind: "student" | "group" | "class"; id: string };
  delta: number;
  category?: string;
}

export interface PointsData {
  students: Record<string, number>;
  groups: Record<string, number>;
  whole: number;
  history: PointEvent[];
  /** Key of the last automatic reset period, e.g. "2026-11-13" or "2026-W46". */
  periodKey?: string;
}

export interface ParticipationData {
  lessonStartedAt: number;
  checked: string[];
  /** Previous `checked` arrays for undo. */
  history: string[][];
}

export interface ClassRecords {
  points: Record<string, PointsData>; // by classId
  participation: Record<string, ParticipationData>; // by classId
  picker: Record<string, string[]>; // `${classId}:${instanceId}` → drawn student ids
  rewards: Record<string, number>; // `${classId}:${instanceId}` → progress count
  hallpass: Record<string, HallPassData>; // by classId
}

/** One trip out of the room. Names are copied so the log stays readable if the roster changes. */
export interface HallPassEntry {
  id: string;
  studentId: string;
  name: string;
  destination: string;
  outAt: number;
  inAt?: number | null;
  /** Who checked the student out. "student" is reserved for the future student dashboard. */
  source: "teacher" | "student";
  remindedAt?: number | null;
}

export interface HallPassData {
  out: HallPassEntry[];
  log: HallPassEntry[]; // completed trips, newest last
}

/** A record that an objective / TEKS was taught on a given day (teacher data, no student info). */
export interface TaughtEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  loggedAt: number;
  text: string; // the "I can" statement
  teksId?: string | null; // e.g. "111.5:3.4K"
  code?: string | null; // e.g. "3.4K"
  subject?: string | null;
  course?: string | null;
  classId?: string | null;
  className?: string | null;
}

export interface SyncPreferences {
  themes: boolean;
  layouts: boolean;
  presets: boolean;
  favorites: boolean;
  notes: boolean;
  /** Always false until secure, approved cloud storage exists. */
  classRecords: false;
}

export interface PersistedState {
  version: number;
  prefs: Preferences;
  classes: ClassRoom[];
  activeClassId: string | null;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  widgets: Record<string, WidgetInstance>;
  sessions: Record<string, unknown>;
  favorites: Favorite[];
  routines: QuickRoutine[];
  dock: DockItem[];
  records: ClassRecords;
  recentWidgetTypes: WidgetType[];
  sync: SyncPreferences;
  /** Objectives / TEKS taught, by day. */
  taught: TaughtEntry[];
}
