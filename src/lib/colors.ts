/** Widget accent palette. Each entry has a solid accent and a soft tint; text on accent is checked for contrast. */
export const WIDGET_COLORS = {
  red: { label: "Cherry", accent: "#e5484d", soft: "#ffe5e6", ink: "#ffffff" },
  orange: { label: "Tangerine", accent: "#f76b15", soft: "#ffeadb", ink: "#ffffff" },
  amber: { label: "Sunflower", accent: "#f5b700", soft: "#fff5cc", ink: "#2b2100" },
  lime: { label: "Lime", accent: "#7cbf2a", soft: "#eef8dc", ink: "#152400" },
  green: { label: "Mint", accent: "#2bb673", soft: "#dcf6e9", ink: "#ffffff" },
  teal: { label: "Lagoon", accent: "#12a594", soft: "#d5f4f0", ink: "#ffffff" },
  sky: { label: "Sky", accent: "#0c8ce9", soft: "#dcefff", ink: "#ffffff" },
  indigo: { label: "Indigo", accent: "#5b5bd6", soft: "#e6e6ff", ink: "#ffffff" },
  purple: { label: "Grape", accent: "#8e4ec6", soft: "#f1e4fb", ink: "#ffffff" },
  pink: { label: "Bubblegum", accent: "#d6409f", soft: "#fde4f2", ink: "#ffffff" },
  slate: { label: "Chalk", accent: "#5b6779", soft: "#e8ecf2", ink: "#ffffff" },
} as const;

export type WidgetColorKey = keyof typeof WIDGET_COLORS;

export const COLOR_KEYS = Object.keys(WIDGET_COLORS) as WidgetColorKey[];

export function colorOf(key: string | undefined) {
  return WIDGET_COLORS[(key as WidgetColorKey) ?? "sky"] ?? WIDGET_COLORS.sky;
}

/** Colors used for spinner segments etc. */
export const SEGMENT_COLORS = [
  "#e5484d",
  "#f76b15",
  "#f5b700",
  "#2bb673",
  "#0c8ce9",
  "#5b5bd6",
  "#8e4ec6",
  "#d6409f",
  "#12a594",
  "#7cbf2a",
];
