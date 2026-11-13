/**
 * Widget definitions: metadata, default configuration and pack/category placement.
 * UI components live in ./registry.tsx so this file stays import-safe for the store.
 */
import type { WidgetSize, WidgetType } from "@/lib/types";
import type { WidgetColorKey } from "@/lib/colors";
import { uid } from "@/lib/ids";

export type WidgetCategory = "Essentials" | "Students" | "Randomizers" | "Management" | "Rewards" | "Schedule";

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  emoji: string;
  description: string;
  category: WidgetCategory;
  keywords: string[];
  defaultColor: WidgetColorKey;
  defaultSize: WidgetSize;
  usesRoster: boolean;
  defaultConfig: () => Record<string, unknown>;
  /** Strip content that should not travel with a Favorite (e.g. note text). */
  favoriteConfig?: (config: Record<string, unknown>) => Record<string, unknown>;
}

const opt = (labels: string[]) => labels.map((label) => ({ id: uid("opt"), label }));

export const DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  timer: {
    type: "timer",
    name: "Timer",
    emoji: "⏱️",
    description: "Countdowns with quick durations, repeat and station rotation.",
    category: "Essentials",
    keywords: ["countdown", "stopwatch", "minutes", "stations", "rotation"],
    defaultColor: "orange",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({
      durationSec: 300,
      soundOn: true,
      sound: "chime",
      visual: "ring",
      repeat: false,
      stations: { enabled: false, names: ["Station 1", "Station 2", "Station 3"] },
    }),
  },
  clock: {
    type: "clock",
    name: "Clock",
    emoji: "🕒",
    description: "Live digital clock, 12 or 24 hour.",
    category: "Essentials",
    keywords: ["time", "date"],
    defaultColor: "sky",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ use24h: false, showSeconds: true, showDate: true, style: "big" }),
  },
  roster: {
    type: "roster",
    name: "Class Roster",
    emoji: "📋",
    description: "Classes, students, groups — paste, type or import CSV.",
    category: "Students",
    keywords: ["class", "students", "names", "csv", "import", "groups", "tables"],
    defaultColor: "indigo",
    defaultSize: "M",
    usesRoster: true,
    defaultConfig: () => ({}),
  },
  picker: {
    type: "picker",
    name: "Name Picker",
    emoji: "🎯",
    description: "Random student picker — no repeats until you reset the round.",
    category: "Students",
    keywords: ["random", "student", "name picker", "call on", "cold call", "pick"],
    defaultColor: "purple",
    defaultSize: "M",
    usesRoster: true,
    defaultConfig: () => ({ markParticipation: false }),
  },
  points: {
    type: "points",
    name: "Point Tracker",
    emoji: "⭐",
    description: "Student, table and whole-class points with goals.",
    category: "Students",
    keywords: ["points", "score", "behavior", "dojo", "rewards", "class points", "tables"],
    defaultColor: "amber",
    defaultSize: "M",
    usesRoster: true,
    defaultConfig: () => ({
      mode: "class",
      step: 1,
      categories: ["Teamwork", "Kindness", "Effort"],
      goal: 20,
      celebrate: true,
      resetMode: "manual",
    }),
  },
  participation: {
    type: "participation",
    name: "Participation",
    emoji: "✅",
    description: "One-tap check-off of who has participated this lesson.",
    category: "Students",
    keywords: ["participation", "check", "attendance", "who spoke"],
    defaultColor: "green",
    defaultSize: "M",
    usesRoster: true,
    defaultConfig: () => ({ showFilter: "all" }),
  },
  notes: {
    type: "notes",
    name: "Sticky Note",
    emoji: "📝",
    description: "Quick notes that auto-save.",
    category: "Essentials",
    keywords: ["note", "sticky", "text", "reminder", "write"],
    defaultColor: "amber",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ scope: "general", fontSize: "md", text: {} }),
    favoriteConfig: (c) => ({ ...c, text: {} }),
  },
  checklist: {
    type: "checklist",
    name: "Checklist",
    emoji: "☑️",
    description: "Reusable checklists with daily reset.",
    category: "Essentials",
    keywords: ["todo", "list", "tasks", "materials", "dismissal", "transition"],
    defaultColor: "teal",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({
      title: "Lesson tasks",
      scope: "general",
      dailyReset: true,
      items: opt(["Take attendance", "Share learning target", "Exit ticket"]).map((o) => ({ id: o.id, text: o.label })),
    }),
  },
  dice: {
    type: "dice",
    name: "Dice",
    emoji: "🎲",
    description: "3D dice that really roll.",
    category: "Randomizers",
    keywords: ["dice", "die", "roll", "random number"],
    defaultColor: "red",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ count: 1, dieColor: "red" }),
  },
  spinner: {
    type: "spinner",
    name: "Spinning Wheel",
    emoji: "🎡",
    description: "A wheel that spins and lands on the pointer.",
    category: "Randomizers",
    keywords: ["wheel", "spinner", "spin", "random", "wheel of names"],
    defaultColor: "pink",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({ options: opt(["Read", "Draw", "Share", "Write", "Build", "Act it out"]) }),
  },
  choice: {
    type: "choice",
    name: "Choice Picker",
    emoji: "🃏",
    description: "Randomly pick from your own list.",
    category: "Randomizers",
    keywords: ["choice", "random", "list", "pick", "decide"],
    defaultColor: "lime",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ options: opt(["Think-Pair-Share", "Turn & Talk", "Quick Write", "Gallery Walk"]) }),
  },
  coin: {
    type: "coin",
    name: "Flip a Coin",
    emoji: "🪙",
    description: "Animated two-sided coin.",
    category: "Randomizers",
    keywords: ["coin", "heads", "tails", "flip", "toss"],
    defaultColor: "amber",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({}),
  },
  soundboard: {
    type: "soundboard",
    name: "Soundboard",
    emoji: "🔔",
    description: "Bell, chime, applause and attention signals.",
    category: "Management",
    keywords: ["sound", "bell", "chime", "applause", "attention", "audio"],
    defaultColor: "sky",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ favorites: ["bell"] }),
  },
  voice: {
    type: "voice",
    name: "Voice Level",
    emoji: "🎙️",
    description: "Voice expectations plus a live classroom noise meter.",
    category: "Management",
    keywords: ["noise", "voice", "volume", "meter", "microphone", "quiet", "loud"],
    defaultColor: "green",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({ level: "whisper", sensitivity: 1.5, customThresholds: false, yellow: 40, red: 70 }),
  },
  tally: {
    type: "tally",
    name: "Tally Counter",
    emoji: "🔢",
    description: "Count anything, with an optional goal.",
    category: "Rewards",
    keywords: ["count", "tally", "counter", "goal"],
    defaultColor: "indigo",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ label: "Tally", goal: 0, step: 1 }),
  },
  reward: {
    type: "reward",
    name: "Reward Tracker",
    emoji: "🏆",
    description: "Stars, jar, puzzle, plant or your own picture.",
    category: "Rewards",
    keywords: ["reward", "jar", "marble", "stars", "goal", "puzzle", "plant", "class reward"],
    defaultColor: "purple",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({ style: "jar", goal: 10, label: "Class reward", image: null, celebrate: true }),
    favoriteConfig: (c) => ({ ...c, image: null }),
  },
  groups: {
    type: "groups",
    name: "Group Maker",
    emoji: "👥",
    description: "Random pairs or groups from your roster.",
    category: "Students",
    keywords: ["groups", "partners", "pairs", "teams"],
    defaultColor: "teal",
    defaultSize: "M",
    usesRoster: true,
    defaultConfig: () => ({ mode: "groups", size: 4 }),
  },
  queue: {
    type: "queue",
    name: "Turn Queue",
    emoji: "🚶",
    description: "Who's next? A simple turn-taking line.",
    category: "Students",
    keywords: ["queue", "line", "turns", "next", "help"],
    defaultColor: "orange",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({}),
  },
  status: {
    type: "status",
    name: "Class Status",
    emoji: "🚦",
    description: "Show what the class is doing right now.",
    category: "Management",
    keywords: ["status", "mode", "activity", "testing", "break"],
    defaultColor: "slate",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({
      statuses: ["Teaching", "Independent Work", "Partner Work", "Testing", "Transition", "Break"],
      current: "Teaching",
    }),
  },
  cues: {
    type: "cues",
    name: "Visual Cues",
    emoji: "👀",
    description: "Read, write, listen, stop, work together.",
    category: "Management",
    keywords: ["cue", "visual", "icons", "read", "write", "listen", "stop"],
    defaultColor: "pink",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({
      cues: [
        { id: "read", icon: "📖", label: "Read" },
        { id: "write", icon: "✏️", label: "Write" },
        { id: "listen", icon: "👂", label: "Listen" },
        { id: "stop", icon: "✋", label: "Stop" },
        { id: "together", icon: "🤝", label: "Work Together" },
      ],
      active: null,
    }),
  },
  schedule: {
    type: "schedule",
    name: "Schedule",
    emoji: "🗓️",
    description: "Current period and countdown to the next transition.",
    category: "Schedule",
    keywords: ["schedule", "period", "bell schedule", "transition", "next"],
    defaultColor: "sky",
    defaultSize: "M",
    usesRoster: false,
    defaultConfig: () => ({
      periods: [
        { id: uid("p"), name: "Morning Meeting", start: "08:00", end: "08:20" },
        { id: uid("p"), name: "Reading", start: "08:20", end: "09:30" },
        { id: uid("p"), name: "Math", start: "09:35", end: "10:45" },
      ],
      remindMinutes: 2,
      remindSound: true,
      use24h: false,
    }),
  },
  reminders: {
    type: "reminders",
    name: "Reminders",
    emoji: "⏰",
    description: "Private teacher reminders, one-time or recurring.",
    category: "Schedule",
    keywords: ["reminder", "alarm", "alert", "remember"],
    defaultColor: "red",
    defaultSize: "S",
    usesRoster: false,
    defaultConfig: () => ({ items: [] }),
  },
};

export const ALL_TYPES = Object.keys(DEFINITIONS) as WidgetType[];

export const CATEGORIES: WidgetCategory[] = ["Essentials", "Students", "Randomizers", "Management", "Rewards", "Schedule"];

export interface WidgetPack {
  id: string;
  name: string;
  emoji: string;
  description: string;
  types: WidgetType[];
}

export const PACKS: WidgetPack[] = [
  { id: "management", name: "Classroom Management", emoji: "🧭", description: "Voice levels, sounds, status and visual cues.", types: ["voice", "soundboard", "status", "cues"] },
  { id: "activities", name: "Interactive Activities", emoji: "🎲", description: "Dice, spinner, choices, coin, groups and a turn queue.", types: ["dice", "spinner", "choice", "coin", "groups", "queue"] },
  { id: "rewards", name: "Rewards", emoji: "🏆", description: "Reward tracker and tally counter.", types: ["reward", "tally"] },
  { id: "schedule", name: "Schedule & Routines", emoji: "🗓️", description: "Schedule awareness and private reminders.", types: ["schedule", "reminders"] },
];

export function defOf(type: WidgetType): WidgetDefinition {
  return DEFINITIONS[type];
}
