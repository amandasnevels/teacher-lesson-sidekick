"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { globalUndo, pickStudent, runRoutine, widgetsOfType } from "@/store/actions";
import { currentSession, pause, start, type TimerConfig, type TimerSession } from "@/widgets/timer/timerLogic";

/**
 * Safe default shortcuts (Alt+Shift combos avoid browser-reserved keys).
 * Ctrl/⌘+K and "/" open Quick Find.
 */
export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl/⌘ + K  or  /", label: "Open Quick Find" },
  { keys: "Alt + Shift + T", label: "Start / pause the focused timer" },
  { keys: "Alt + Shift + P", label: "Pick a random student" },
  { keys: "Alt + Shift + A", label: "Open the Widget Library" },
  { keys: "Alt + Shift + Z", label: "Undo last action" },
  { keys: "Alt + Shift + R", label: "Run the selected Quick Routine" },
];

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

export function toggleFocusedTimer() {
  const s = useSidekick.getState();
  const ids = widgetsOfType("timer");
  const id = s.lastTimerId && ids.includes(s.lastTimerId) ? s.lastTimerId : ids[0];
  if (!id) return;
  const cfg = s.widgets[id].config as unknown as TimerConfig;
  const sess = currentSession(cfg, s.sessions[id] as TimerSession | undefined);
  s.setSession(id, sess.status === "running" ? pause(sess, Date.now()) : start(sess, Date.now()));
  s.setLastTimer(id);
  s.flashWidget(id);
}

export function Shortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useSidekick.getState();
      if (!s.prefs.shortcutsEnabled) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setQuickFind(true);
        return;
      }
      if (e.key === "/" && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        s.setQuickFind(true);
        return;
      }
      if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        KeyT: toggleFocusedTimer,
        KeyP: pickStudent,
        KeyA: () => s.openLibrary("new"),
        KeyZ: globalUndo,
        KeyR: () => {
          const rid = s.prefs.shortcutRoutineId ?? s.routines[0]?.id;
          if (rid) runRoutine(rid);
        },
      };
      const fn = map[e.code];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
