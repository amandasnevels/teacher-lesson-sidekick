/**
 * The eight built-in teaching workspace presets — the single source for the opening chooser,
 * "+ New workspace" templates and tests.
 *
 * Presets are static product templates: widget types, order and safe default settings only.
 * They never contain rosters, grades, notes or any other personal or district records.
 * CHAMPS is in every preset; Voice Level in every preset except Whole Group (see workspaceLogic).
 */
import type { WidgetType, WorkspaceKind } from "@/lib/types";

export interface PresetWidget {
  type: WidgetType;
  /** Shown instead of the widget's usual name (e.g. Hall Pass → "Check Out"). */
  title?: string;
  /** Merged over the widget's own default settings. */
  config?: Record<string, unknown>;
}

export type PresetKind = Exclude<WorkspaceKind, "assessment">;

export interface WorkspacePreset {
  kind: PresetKind;
  name: string;
  emoji: string;
  description: string;
  widgets: PresetWidget[];
}

const champs = (active: string): PresetWidget => ({ type: "champs", config: { active } });
const clockWithDate: PresetWidget = { type: "clock", config: { showDate: true } };

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    kind: "bryan",
    name: "Bryan ISD Workspace",
    emoji: "🏫",
    description: "The district daily set: time, objectives, expectations and check-outs.",
    widgets: [
      clockWithDate,
      { type: "timer", config: { durationSec: 300 } },
      { type: "ican" },
      { type: "iwill" },
      champs("wholeGroup"),
      { type: "hallpass", title: "Check Out" },
      { type: "picker" },
      { type: "voice" },
    ],
  },
  {
    kind: "wholeGroup",
    name: "Whole Group",
    emoji: "🧑‍🏫",
    description: "Direct teaching with objectives, calling on students and quick cues.",
    widgets: [champs("wholeGroup"), clockWithDate, { type: "timer" }, { type: "ican" }, { type: "picker" }, { type: "participation" }, { type: "soundboard" }, { type: "cues" }],
  },
  {
    kind: "centers",
    name: "Stations & Centers",
    emoji: "🧩",
    description: "15-minute station rotations, groups and a clear plan for each center.",
    widgets: [
      champs("stations"),
      { type: "voice", config: { level: "table" } },
      { type: "timer", config: { durationSec: 900, stations: { enabled: true, names: ["Station 1", "Station 2", "Station 3", "Teacher Table"] } } },
      { type: "groups" },
      { type: "spinner" },
      { type: "checklist" },
      { type: "schedule" },
      { type: "soundboard" },
    ],
  },
  {
    kind: "testing",
    name: "Testing",
    emoji: "📝",
    description: "A calm, silent setup: no alarms or celebrations, with check-outs and status.",
    widgets: [
      champs("assessments"),
      // Silent expectation; the microphone is never turned on automatically.
      { type: "voice", config: { level: "silent", alertOn: false } },
      clockWithDate,
      { type: "timer", config: { soundOn: false } },
      { type: "hallpass", config: { reminderSound: false } },
      { type: "checklist" },
      { type: "status", config: { current: "Testing" } },
    ],
  },
  {
    kind: "smallGroup",
    name: "Small Group",
    emoji: "👥",
    description: "A quiet teacher-table setup with groups, objectives and participation.",
    widgets: [champs("smallGroup"), { type: "voice", config: { level: "whisper" } }, { type: "timer" }, { type: "ican" }, { type: "groups" }, { type: "participation" }, { type: "notes" }],
  },
  {
    kind: "management",
    name: "Classroom Management",
    emoji: "🧭",
    description: "Status, cues, points and rewards — kept separately for each class.",
    widgets: [champs("wholeGroup"), { type: "voice" }, { type: "status" }, { type: "cues" }, { type: "points" }, { type: "reward" }, { type: "queue" }, { type: "soundboard" }],
  },
  {
    kind: "daily",
    name: "Daily Organization",
    emoji: "🗓️",
    description: "Your day at a glance: schedule, reminders, check-outs and notes.",
    widgets: [champs("wholeGroup"), { type: "voice" }, clockWithDate, { type: "schedule" }, { type: "reminders" }, { type: "hallpass" }, { type: "checklist" }, { type: "notes" }],
  },
  {
    kind: "custom",
    name: "Custom Workspace",
    emoji: "✨",
    description: "Start with just CHAMPS and Voice Level, then add your own tools.",
    widgets: [champs("wholeGroup"), { type: "voice" }],
  },
];

export const presetOf = (kind: string | undefined | null) => WORKSPACE_PRESETS.find((p) => p.kind === kind);
