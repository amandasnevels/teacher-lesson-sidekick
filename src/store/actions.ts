/**
 * Cross-cutting teaching actions used by the Quick Dock, Quick Find, keyboard shortcuts and
 * Quick Routines. Each action does exactly one well-defined thing; routines never clear
 * student records or delete data.
 */
import type { DockActionId, DockItem, QuickRoutine, RoutineAction, WidgetType } from "@/lib/types";
import type { ParsedCommand } from "@/lib/commands";
import { playSound, stopAllSounds } from "@/lib/audio";
import { uid } from "@/lib/ids";
import { DEFINITIONS } from "@/widgets/definitions";
import { initialSession, reset as resetTimer, start as startTimerSession, type TimerConfig } from "@/widgets/timer/timerLogic";
import { useSidekick } from "./store";

const S = () => useSidekick.getState();

/** Visible widgets of a type in the active workspace (in order). */
export function widgetsOfType(type: WidgetType): string[] {
  const s = S();
  const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
  return (ws?.widgetIds ?? []).filter((id) => s.widgets[id]?.type === type && !s.widgets[id]?.removedAt);
}

/** Return a widget of `type` in the active workspace, creating one when missing. */
export function ensureWidget(type: WidgetType, opts: { reveal?: boolean; preferId?: string | null } = {}): string {
  const ids = widgetsOfType(type);
  let id = opts.preferId && ids.includes(opts.preferId) ? opts.preferId : ids[0];
  if (!id) id = S().addWidget(type);
  if (opts.reveal) {
    if (S().widgets[id]?.collapsed) S().updateWidget(id, { collapsed: false });
    S().flashWidget(id);
  }
  return id;
}

export function startTimerFor(seconds: number) {
  const s = S();
  const id = ensureWidget("timer", { preferId: s.lastTimerId });
  const durationSec = Math.max(1, Math.round(seconds));
  s.updateConfig(id, { durationSec });
  const cfg = S().widgets[id].config as unknown as TimerConfig;
  s.setSession(id, startTimerSession(initialSession({ durationSec: cfg.durationSec }), Date.now()));
  s.setLastTimer(id);
  s.flashWidget(id);
  return id;
}

function requireRoster(): boolean {
  const s = S();
  const cls = s.classes.find((c) => c.id === s.activeClassId);
  if (cls && cls.students.length > 0) return true;
  s.toast({ message: "Add a class roster first.", tone: "warn", actionLabel: "Open roster", onAction: () => ensureWidget("roster", { reveal: true }) });
  return false;
}

export function pickStudent() {
  if (!requireRoster()) return;
  const id = ensureWidget("picker", { reveal: true });
  S().signal(id, "pick");
}

export function rollDice() {
  S().signal(ensureWidget("dice", { reveal: true }), "roll");
}
export function flipCoin() {
  S().signal(ensureWidget("coin", { reveal: true }), "flip");
}
export function spinWheel() {
  S().signal(ensureWidget("spinner", { reveal: true }), "spin");
}
export function pickChoice() {
  S().signal(ensureWidget("choice", { reveal: true }), "pick");
}

export function awardClassPoint(delta = 1) {
  const s = S();
  if (!s.activeClassId) {
    s.toast({ message: "Choose or create a class to track points.", tone: "warn", actionLabel: "Classes", onAction: () => S().openSettings("classes") });
    return;
  }
  s.pushUndo("Class point", ["records"]);
  s.addPoints(s.activeClassId, { kind: "class", id: s.activeClassId }, delta);
  const total = S().records.points[s.activeClassId]?.whole ?? 0;
  s.toast({ message: `⭐ Class point! Total: ${total}`, tone: "success", timeout: 2500 });
}

export function globalUndo() {
  const label = S().undo();
  S().toast({ message: label ? `Undid: ${label}` : "Nothing to undo", timeout: 2500 });
}

/* ------------------------------------------------------------------ routines */

export function executeRoutineAction(a: RoutineAction) {
  const s = S();
  switch (a.kind) {
    case "startTimer":
      startTimerFor(a.minutes * 60);
      return;
    case "setVoiceLevel": {
      const id = ensureWidget("voice");
      s.updateConfig(id, { level: a.level });
      return;
    }
    case "setStatus": {
      const id = ensureWidget("status");
      s.updateConfig(id, (c) => {
        const list = (c.statuses as string[]) ?? [];
        return { ...c, current: a.status, statuses: list.includes(a.status) ? list : [...list, a.status] };
      });
      return;
    }
    case "showWidget":
      ensureWidget(a.widgetType, { reveal: true });
      return;
    case "hideWidget":
      for (const id of widgetsOfType(a.widgetType)) s.updateWidget(id, { collapsed: true });
      return;
    case "openChecklist": {
      const existing = widgetsOfType("checklist").find((id) => (S().widgets[id].config.title as string) === a.title);
      if (existing) {
        s.updateWidget(existing, { collapsed: false });
        s.flashWidget(existing);
      } else {
        const id = s.addWidget("checklist", { config: { title: a.title, items: a.items.map((text) => ({ id: uid("i"), text })) } });
        s.flashWidget(id);
      }
      return;
    }
    case "playSound":
      playSound(a.sound);
      return;
    case "resetWidget":
      for (const id of widgetsOfType(a.widgetType)) {
        if (a.widgetType === "timer") s.setSession(id, resetTimer(S().widgets[id].config as unknown as TimerConfig));
        else s.setSession(id, undefined);
      }
      return;
    case "switchWorkspace":
      s.setActiveWorkspace(a.workspaceId);
      return;
  }
}

export function runRoutine(routineId: string) {
  const s = S();
  const r = s.routines.find((x) => x.id === routineId);
  if (!r) return;
  s.pushUndo(`Routine: ${r.name}`, ["widgets", "sessions", "workspaces", "activeWorkspaceId"]);
  for (const a of r.actions) executeRoutineAction(a);
  S().toast({ message: `${r.icon} ${r.name}`, tone: "success", actionLabel: "Undo", onAction: () => S().undo(), timeout: 4000 });
}

/** Describe an action in plain words (used in the routine editor and previews). */
export function describeAction(a: RoutineAction): string {
  switch (a.kind) {
    case "startTimer":
      return `Start a ${a.minutes}-minute timer`;
    case "setVoiceLevel":
      return `Voice level: ${a.level}`;
    case "setStatus":
      return `Status: ${a.status}`;
    case "showWidget":
      return `Show ${DEFINITIONS[a.widgetType].name}`;
    case "hideWidget":
      return `Collapse ${DEFINITIONS[a.widgetType].name}`;
    case "openChecklist":
      return `Open checklist “${a.title}”`;
    case "playSound":
      return `Play ${a.sound}`;
    case "resetWidget":
      return `Reset ${DEFINITIONS[a.widgetType].name}`;
    case "switchWorkspace": {
      const ws = S().workspaces.find((w) => w.id === a.workspaceId);
      return `Switch to “${ws?.name ?? "missing workspace"}”`;
    }
  }
}

/** Build routine actions from what is currently on screen (Quick Routine method 3). */
export function routineFromCurrentSetup(): QuickRoutine {
  const s = S();
  const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId)!;
  const actions: RoutineAction[] = [{ kind: "switchWorkspace", workspaceId: ws.id }];
  const seen = new Set<string>();
  for (const id of ws.widgetIds) {
    const w = s.widgets[id];
    if (!w) continue;
    if (w.type === "timer" && !seen.has("timer")) {
      seen.add("timer");
      actions.push({ kind: "startTimer", minutes: Math.max(1, Math.round(Number(w.config.durationSec ?? 300) / 60)) });
    } else if (w.type === "voice" && !seen.has("voice")) {
      seen.add("voice");
      actions.push({ kind: "setVoiceLevel", level: (w.config.level as never) ?? "whisper" });
    } else if (w.type === "status" && !seen.has("status")) {
      seen.add("status");
      actions.push({ kind: "setStatus", status: String(w.config.current ?? "Teaching") });
    }
  }
  return { id: uid("r"), name: `${ws.name} routine`, icon: "⚡", color: "sky", actions };
}

/* ------------------------------------------------------------------ dock */

export const DOCK_ACTIONS: Record<DockActionId, { label: string; emoji: string; run: () => void }> = {
  timer1: { label: "1 min", emoji: "⏱️", run: () => startTimerFor(60) },
  timer3: { label: "3 min", emoji: "⏱️", run: () => startTimerFor(180) },
  timer5: { label: "5 min", emoji: "⏱️", run: () => startTimerFor(300) },
  timer10: { label: "10 min", emoji: "⏱️", run: () => startTimerFor(600) },
  pickStudent: { label: "Pick", emoji: "🎯", run: pickStudent },
  classPoint: { label: "+1 Class", emoji: "⭐", run: () => awardClassPoint(1) },
  bell: { label: "Bell", emoji: "🔔", run: () => playSound("bell") },
  attention: { label: "Attention", emoji: "📣", run: () => playSound("attention") },
  rollDice: { label: "Roll", emoji: "🎲", run: rollDice },
  flipCoin: { label: "Flip", emoji: "🪙", run: flipCoin },
  undo: { label: "Undo", emoji: "↩️", run: globalUndo },
};

export function dockItemInfo(item: DockItem): { label: string; emoji: string; color?: string; missing?: boolean } {
  const s = S();
  switch (item.kind) {
    case "action":
      return DOCK_ACTIONS[item.action] ?? { label: "?", emoji: "❓", missing: true };
    case "routine": {
      const r = s.routines.find((x) => x.id === item.routineId);
      return r ? { label: r.name, emoji: r.icon, color: r.color } : { label: "Missing routine", emoji: "❓", missing: true };
    }
    case "favorite": {
      const f = s.favorites.find((x) => x.id === item.favoriteId);
      return f ? { label: f.name, emoji: DEFINITIONS[f.type].emoji, color: f.color } : { label: "Missing favorite", emoji: "❓", missing: true };
    }
    case "widget": {
      const w = s.widgets[item.widgetId];
      return w ? { label: w.title || DEFINITIONS[w.type].name, emoji: DEFINITIONS[w.type].emoji, color: w.color } : { label: "Missing widget", emoji: "❓", missing: true };
    }
  }
}

export function runDockItem(item: DockItem) {
  const s = S();
  switch (item.kind) {
    case "action":
      DOCK_ACTIONS[item.action]?.run();
      return;
    case "routine":
      runRoutine(item.routineId);
      return;
    case "favorite": {
      const id = s.addFromFavorite(item.favoriteId);
      if (id) S().flashWidget(id);
      return;
    }
    case "widget": {
      const w = s.widgets[item.widgetId];
      if (!w) return;
      if (w.removedAt) s.restoreWidget(w.id);
      else if (w.workspaceId !== s.activeWorkspaceId) s.setActiveWorkspace(w.workspaceId);
      if (S().widgets[w.id].collapsed) s.updateWidget(w.id, { collapsed: false });
      s.flashWidget(w.id);
      return;
    }
  }
}

/* ------------------------------------------------------------------ Quick Find */

export function runCommand(cmd: ParsedCommand) {
  switch (cmd.kind) {
    case "timer":
      startTimerFor(cmd.seconds);
      return;
    case "rollDice":
      return rollDice();
    case "flipCoin":
      return flipCoin();
    case "pickStudent":
      return pickStudent();
    case "spinWheel":
      return spinWheel();
    case "pickChoice":
      return pickChoice();
    case "playSound":
      playSound(cmd.sound);
      return;
    case "undo":
      return globalUndo();
    case "classPoint":
      return awardClassPoint(1);
  }
}

export { stopAllSounds };
