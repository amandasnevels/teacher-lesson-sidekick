import type { ThemeId } from "./types";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  emoji: string;
  dark?: boolean;
  /** CSS custom properties applied to <html>. */
  vars: Record<string, string>;
  /** Three swatches for the theme picker preview. */
  swatches: [string, string, string];
}

const base = {
  "--ink": "#1d2433",
  "--ink-soft": "#4a5468",
  "--card": "#ffffff",
  "--line": "#e3e7ef",
};

export const THEMES: ThemeDef[] = [
  {
    id: "rainbow",
    name: "Rainbow Classroom",
    emoji: "🌈",
    swatches: ["#e5484d", "#f5b700", "#0c8ce9"],
    vars: { ...base, "--bg": "#f4f6ff", "--bg-art": "radial-gradient(circle at 10% 0%, #ffe5e6 0, transparent 40%), radial-gradient(circle at 90% 10%, #dcefff 0, transparent 40%), radial-gradient(circle at 50% 100%, #fff5cc 0, transparent 45%)", "--brand": "#5b5bd6", "--brand-ink": "#ffffff" },
  },
  {
    id: "bold",
    name: "Bright & Bold",
    emoji: "⚡",
    swatches: ["#d6409f", "#0c8ce9", "#f76b15"],
    vars: { ...base, "--bg": "#fff7ec", "--bg-art": "linear-gradient(160deg, #fff0f7 0%, #fff7ec 50%, #e9f4ff 100%)", "--brand": "#d6409f", "--brand-ink": "#ffffff" },
  },
  {
    id: "pastel",
    name: "Pastel Classroom",
    emoji: "🧁",
    swatches: ["#f8c8dc", "#c8e7f8", "#d8f5c8"],
    vars: { ...base, "--bg": "#fbf7fd", "--bg-art": "linear-gradient(180deg, #fbeef6 0%, #eef6fb 100%)", "--brand": "#8e4ec6", "--brand-ink": "#ffffff" },
  },
  {
    id: "sunshine",
    name: "Sunshine",
    emoji: "☀️",
    swatches: ["#f5b700", "#f76b15", "#2bb673"],
    vars: { ...base, "--bg": "#fffbea", "--bg-art": "radial-gradient(circle at 85% 0%, #fff1a8 0, transparent 45%)", "--brand": "#c2410c", "--brand-ink": "#ffffff" },
  },
  {
    id: "autumn",
    name: "Autumn",
    emoji: "🍂",
    swatches: ["#c2410c", "#b45309", "#7c2d12"],
    vars: { ...base, "--bg": "#fdf4ea", "--bg-art": "linear-gradient(160deg, #fde7d2 0%, #fdf4ea 60%)", "--brand": "#b45309", "--brand-ink": "#ffffff" },
  },
  {
    id: "winter",
    name: "Winter",
    emoji: "❄️",
    swatches: ["#0c8ce9", "#5b5bd6", "#94a3b8"],
    vars: { ...base, "--bg": "#f0f6fc", "--bg-art": "linear-gradient(180deg, #e3effb 0%, #f7fbff 100%)", "--brand": "#1d6fd1", "--brand-ink": "#ffffff" },
  },
  {
    id: "spring",
    name: "Spring",
    emoji: "🌷",
    swatches: ["#2bb673", "#d6409f", "#f5b700"],
    vars: { ...base, "--bg": "#f3fbf4", "--bg-art": "radial-gradient(circle at 0% 100%, #fde4f2 0, transparent 40%), radial-gradient(circle at 100% 0%, #dcf6e9 0, transparent 45%)", "--brand": "#15803d", "--brand-ink": "#ffffff" },
  },
  {
    id: "dark",
    name: "Dark Mode",
    emoji: "🌙",
    dark: true,
    swatches: ["#1e2230", "#5b5bd6", "#2bb673"],
    vars: { "--ink": "#eef1f7", "--ink-soft": "#b6bed0", "--card": "#1d2230", "--line": "#323a4e", "--bg": "#121520", "--bg-art": "radial-gradient(circle at 80% 0%, #1f2440 0, transparent 50%)", "--brand": "#8b8bf0", "--brand-ink": "#0d0f1a" },
  },
];

export function getTheme(id: ThemeId | string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const t = getTheme(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  root.dataset.theme = t.id;
  root.classList.toggle("dark", !!t.dark);
  root.style.colorScheme = t.dark ? "dark" : "light";
}
