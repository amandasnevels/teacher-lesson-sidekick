/**
 * Shareable "settings packs": workspaces, widget configurations, favorites, routines and theme.
 * Student names and class records are NEVER included. Note text and uploaded pictures are dropped too.
 */
import type { Favorite, PersistedState, QuickRoutine, RoutineAction, WidgetInstance, WidgetSize, WidgetType } from "./types";
import { ALL_TYPES, DEFINITIONS } from "@/widgets/definitions";
import { uid } from "./ids";

export interface PackWidget {
  type: WidgetType;
  title?: string;
  color: string;
  size: WidgetSize;
  w?: number | null;
  h?: number | null;
  locked: boolean;
  collapsed: boolean;
  config: Record<string, unknown>;
}

export interface SettingsPack {
  kind: "teacher-sidekick-pack";
  version: 1;
  exportedAt: string;
  theme?: string;
  workspaces: { name: string; widgets: PackWidget[] }[];
  favorites: Omit<Favorite, "id" | "createdAt">[];
  routines: (Omit<QuickRoutine, "id" | "actions"> & { actions: (RoutineAction | { kind: "switchWorkspace"; workspaceIndex: number })[] })[];
}

function scrub(value: unknown, names: Set<string>): unknown {
  if (typeof value === "string") return names.has(value.trim().toLowerCase()) ? "" : value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, names));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, names)]));
  return value;
}

export function sanitizeConfig(type: WidgetType, config: Record<string, unknown>, names: Set<string>): Record<string, unknown> {
  const def = DEFINITIONS[type];
  let c = structuredClone(config);
  if (def.favoriteConfig) c = def.favoriteConfig(c); // drops note text, reward images
  return scrub(c, names) as Record<string, unknown>;
}

export function buildSettingsPack(s: PersistedState): SettingsPack {
  const names = new Set(s.classes.flatMap((c) => c.students.map((st) => st.name.trim().toLowerCase())));
  const wsIndex = new Map(s.workspaces.map((w, i) => [w.id, i]));
  const packWidget = (w: WidgetInstance): PackWidget => ({
    type: w.type,
    title: w.title ? (scrub(w.title, names) as string) : undefined,
    color: w.color,
    size: w.size,
    w: w.w ?? null,
    h: w.h ?? null,
    locked: w.locked,
    collapsed: w.collapsed,
    config: sanitizeConfig(w.type, w.config, names),
  });
  return {
    kind: "teacher-sidekick-pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: s.prefs.themeId,
    workspaces: s.workspaces.map((w) => ({ name: w.name, widgets: w.widgetIds.map((id) => s.widgets[id]).filter(Boolean).map(packWidget) })),
    favorites: s.favorites.map((f) => ({ name: scrub(f.name, names) as string, type: f.type, color: f.color, size: f.size, w: f.w ?? null, h: f.h ?? null, config: sanitizeConfig(f.type, f.config, names) })),
    routines: s.routines.map((r) => ({
      name: r.name,
      icon: r.icon,
      color: r.color,
      actions: r.actions.map((a) => (a.kind === "switchWorkspace" ? { kind: "switchWorkspace" as const, workspaceIndex: wsIndex.get(a.workspaceId) ?? 0 } : a)),
    })),
  };
}

/** Validate and convert a pack into new, independent objects (never touches classes or records). */
export function importSettingsPack(raw: unknown, now = Date.now()) {
  const p = raw as SettingsPack;
  if (!p || p.kind !== "teacher-sidekick-pack" || p.version !== 1 || !Array.isArray(p.workspaces)) throw new Error("This file isn't a Teacher Sidekick pack.");
  const validType = (t: unknown): t is WidgetType => typeof t === "string" && (ALL_TYPES as string[]).includes(t);
  const widgets: Record<string, WidgetInstance> = {};
  const workspaces = p.workspaces.slice(0, 20).map((w) => {
    const id = uid("ws");
    const ids: string[] = [];
    for (const pw of (w.widgets ?? []).slice(0, 60)) {
      if (!validType(pw.type)) continue;
      const wid = uid("w");
      widgets[wid] = {
        id: wid,
        type: pw.type,
        title: typeof pw.title === "string" ? pw.title.slice(0, 40) : undefined,
        color: typeof pw.color === "string" ? pw.color : DEFINITIONS[pw.type].defaultColor,
        size: pw.size === "S" || pw.size === "L" ? pw.size : "M",
        w: typeof pw.w === "number" ? Math.min(4, Math.max(1, Math.round(pw.w))) : null,
        h: typeof pw.h === "number" ? Math.min(1600, Math.max(120, Math.round(pw.h))) : null,
        locked: !!pw.locked,
        collapsed: !!pw.collapsed,
        workspaceId: id,
        removedAt: null,
        createdAt: now,
        config: { ...DEFINITIONS[pw.type].defaultConfig(), ...(pw.config && typeof pw.config === "object" ? pw.config : {}) },
      };
      ids.push(wid);
    }
    return { id, name: String(w.name ?? "Imported").slice(0, 40), widgetIds: ids };
  });
  const favorites: Favorite[] = (p.favorites ?? []).filter((f) => validType(f.type)).map((f) => ({ ...f, id: uid("f"), createdAt: now, size: f.size ?? "M", config: f.config ?? {} }));
  const routines: QuickRoutine[] = (p.routines ?? []).map((r) => ({
    id: uid("r"),
    name: String(r.name ?? "Routine").slice(0, 40),
    icon: String(r.icon ?? "⚡").slice(0, 4),
    color: String(r.color ?? "sky"),
    actions: (r.actions ?? [])
      .map((a) => ("workspaceIndex" in a ? (workspaces[a.workspaceIndex] ? { kind: "switchWorkspace" as const, workspaceId: workspaces[a.workspaceIndex].id } : null) : a))
      .filter((a): a is RoutineAction => !!a),
  }));
  return { workspaces, widgets, favorites, routines, theme: p.theme };
}
