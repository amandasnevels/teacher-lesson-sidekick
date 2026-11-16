/**
 * The eight built-in teaching workspace presets — the single source for the opening chooser,
 * "+ New workspace" templates and tests.
 *
 * Presets are static product templates: widget types, order and safe default settings only.
 * They never contain rosters, grades, notes or any other personal or district records.
 * CHAMPS is in every preset; Voice Level in every preset except Whole Group (see workspaceLogic).
 */
import type { WidgetSize, WidgetType, WorkspaceKind } from "@/lib/types";

export interface PresetWidget {
  type: WidgetType;
  /** Shown instead of the widget's usual name (e.g. Hall Pass → "Check Out"). */
  title?: string;
  /** Merged over the widget's own default settings. */
  config?: Record<string, unknown>;
  /** Starting size (S / M / L). */
  size?: WidgetSize;
  /** Width in grid columns (1–4). */
  w?: number;
  /** Where it opens on a wide (7+ column) screen: [column, stack position]. */
  at?: [number, number];
}

export type PresetKind = Exclude<WorkspaceKind, "assessment">;

export interface WorkspacePreset {
  kind: PresetKind;
  name: string;
  emoji: string;
  description: string;
  widgets: PresetWidget[];
}

const champs = (active: string, w = 1): PresetWidget => ({ type: "champs", config: { active }, w });
const clockWithDate: PresetWidget = { type: "clock", config: { showDate: true }, w: 1 };
const smallReward: PresetWidget = { type: "reward", size: "S", w: 1 };
const at = (x: number, row: number, w: PresetWidget): PresetWidget => ({ ...w, at: [x, row] });

/**
 * Layouts follow the teacher-approved screenshots (7 columns wide). On narrower screens the same
 * widths and order are kept and packed to fit.
 */
export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    kind: "bryan",
    name: "Bryan ISD Workspace",
    emoji: "🏫",
    description: "The district daily set: time, objectives, expectations and check-outs.",
    widgets: [
      at(0, 0, clockWithDate),
      at(0, 1, { type: "timer", config: { durationSec: 300 }, w: 1 }),
      at(1, 0, { type: "ican", w: 2 }),
      at(3, 0, { type: "iwill", w: 2 }),
      at(5, 0, champs("wholeGroup")),
      at(3, 1, { type: "hallpass", title: "Check Out", w: 2 }),
      at(1, 1, { type: "picker", w: 2 }),
      at(6, 0, { type: "voice", w: 1 }),
      at(5, 1, { type: "checklist", w: 1 }),
      at(6, 1, smallReward),
    ],
  },
  {
    kind: "wholeGroup",
    name: "Whole Group",
    emoji: "🧑‍🏫",
    description: "Direct teaching with objectives, calling on students and quick cues.",
    widgets: [
      at(0, 0, champs("wholeGroup")),
      at(1, 0, clockWithDate),
      at(1, 1, { type: "timer", w: 1 }),
      at(2, 0, { type: "ican", w: 1 }),
      at(5, 1, { type: "picker", w: 2 }),
      at(5, 0, { type: "participation", w: 2 }),
      at(3, 1, { type: "soundboard", w: 2 }),
      at(3, 0, { type: "cues", w: 2 }),
      at(2, 1, smallReward),
    ],
  },
  {
    kind: "centers",
    name: "Stations & Centers",
    emoji: "🧩",
    description: "15-minute station rotations, groups and a clear plan for each center.",
    widgets: [
      at(0, 0, champs("stations")),
      at(1, 0, { type: "voice", config: { level: "table" }, w: 2 }),
      at(3, 0, { type: "timer", config: { durationSec: 900, stations: { enabled: true, names: ["Station 1", "Station 2", "Station 3", "Teacher Table"] } }, w: 1 }),
      at(4, 0, { type: "groups", w: 2 }),
      at(1, 1, { type: "spinner", w: 2 }),
      at(6, 0, { type: "checklist", w: 1 }),
      at(3, 1, { type: "schedule", w: 3 }),
      at(6, 1, { type: "soundboard", w: 1 }),
    ],
  },
  {
    kind: "testing",
    name: "Testing",
    emoji: "📝",
    description: "A calm, silent setup: no alarms or celebrations, with check-outs and status.",
    widgets: [
      at(0, 0, champs("assessments")),
      // Silent expectation; the microphone is never turned on automatically.
      at(1, 0, { type: "voice", config: { level: "silent", alertOn: false }, w: 2 }),
      at(3, 0, clockWithDate),
      at(4, 0, { type: "timer", config: { soundOn: false }, w: 1 }),
      at(5, 0, { type: "hallpass", config: { reminderSound: false }, w: 2 }),
      at(5, 1, { type: "checklist", w: 2 }),
      at(3, 1, { type: "status", config: { current: "Testing" }, w: 1 }),
    ],
  },
  {
    kind: "smallGroup",
    name: "Small Group",
    emoji: "👥",
    description: "A quiet teacher-table setup with groups, objectives and participation.",
    widgets: [
      at(0, 0, champs("smallGroup")),
      at(1, 0, { type: "voice", config: { level: "whisper" }, w: 2 }),
      at(3, 0, { type: "timer", w: 1 }),
      at(4, 0, { type: "ican", w: 2 }),
      at(4, 1, { type: "groups", w: 2 }),
      at(6, 0, { type: "participation", w: 1 }),
      at(1, 1, { type: "notes", w: 2 }),
      at(3, 1, { type: "hallpass", w: 1 }),
    ],
  },
  {
    kind: "management",
    name: "Classroom Management",
    emoji: "🧭",
    description: "Status, cues, points and rewards — kept separately for each class.",
    widgets: [
      at(0, 0, champs("wholeGroup", 2)),
      at(2, 0, { type: "voice", w: 2 }),
      at(4, 0, { type: "status", w: 1 }),
      at(5, 0, { type: "cues", w: 2 }),
      at(5, 1, { type: "points", w: 2 }),
      at(2, 1, { type: "reward", w: 2 }),
      at(4, 1, { type: "queue", w: 1 }),
      at(5, 2, { type: "soundboard", w: 1 }),
    ],
  },
  {
    kind: "daily",
    name: "Daily Organization",
    emoji: "🗓️",
    description: "Your day at a glance: schedule, reminders, check-outs and notes.",
    widgets: [
      at(0, 0, champs("wholeGroup")),
      at(1, 0, { type: "voice", w: 2 }),
      at(3, 0, clockWithDate),
      at(4, 0, { type: "schedule", w: 2 }),
      at(6, 0, { type: "reminders", w: 1 }),
      at(1, 1, { type: "hallpass", w: 2 }),
      at(3, 1, { type: "checklist", w: 1 }),
      at(6, 1, { type: "notes", w: 1 }),
    ],
  },
  {
    kind: "transition",
    name: "Transition",
    emoji: "🔁",
    description: "Smooth changes between activities: a timer, voice level, points and reminders.",
    widgets: [
      at(0, 0, champs("transitions")),
      at(1, 0, { type: "voice", w: 2 }),
      at(3, 0, { type: "timer", config: { durationSec: 120 }, w: 1 }),
      at(4, 0, { type: "points", w: 2 }),
      at(6, 0, { type: "notes", title: "Student Reminders", w: 1 }),
    ],
  },
  {
    kind: "custom",
    name: "Custom Workspace",
    emoji: "✨",
    description: "Start with just CHAMPS and Voice Level, then add your own tools.",
    widgets: [at(0, 0, champs("wholeGroup")), at(1, 0, { type: "voice", w: 2 })],
  },
];

/** Column counts that get the exact preset layout (wider screens just have spare room on the right). */
export const PRESET_LAYOUT_COLS = [7, 8, 9, 10, 11, 12];

export const presetOf = (kind: string | undefined | null) => WORKSPACE_PRESETS.find((p) => p.kind === kind);
