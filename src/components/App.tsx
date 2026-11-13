"use client";
import { useEffect } from "react";
import { useSidekick, persistedSnapshot } from "@/store/store";
import { loadState, saveState } from "@/store/persist";
import { applyTheme } from "@/lib/themes";
import { setAudioSettings } from "@/lib/audio";
import { useReducedMotion } from "@/store/hooks";
import { onRestore, type TimerSession } from "@/widgets/timer/timerLogic";
import { AppShell } from "./AppShell";
import { TimerEngine } from "./engines/TimerEngine";
import { ReminderEngine } from "./engines/ReminderEngine";
import { Shortcuts } from "./engines/Shortcuts";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

async function flush() {
  if (!dirty) return;
  dirty = false;
  try {
    await saveState(persistedSnapshot());
  } catch (e) {
    useSidekick.getState().toast({ message: `Couldn't save changes: ${(e as Error).message}`, tone: "warn" });
  }
}

export default function App() {
  const hydrated = useSidekick((s) => s.hydrated);
  const themeId = useSidekick((s) => s.prefs.themeId);
  const volume = useSidekick((s) => s.prefs.volume);
  const muted = useSidekick((s) => s.prefs.muted);
  const reduced = useReducedMotion();

  // Load saved data once.
  useEffect(() => {
    let cancelled = false;
    void loadState().then(({ state, recovered }) => {
      if (cancelled) return;
      const now = Date.now();
      // Timers that ran out while the app was closed are marked done — never restarted.
      for (const [id, w] of Object.entries(state.widgets)) {
        if (w.type === "timer" && state.sessions[id]) state.sessions[id] = onRestore(state.sessions[id] as TimerSession, now);
      }
      useSidekick.getState().hydrate(state, recovered ?? null);
      if (recovered) useSidekick.getState().toast({ message: recovered, tone: "warn", timeout: 12000 });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave: debounced write on every persisted change, plus a flush when the page is hidden.
  useEffect(() => {
    if (!hydrated) return;
    let prev = persistedSnapshot();
    const unsub = useSidekick.subscribe((s) => {
      const changed =
        s.prefs !== prev.prefs || s.classes !== prev.classes || s.activeClassId !== prev.activeClassId || s.workspaces !== prev.workspaces ||
        s.activeWorkspaceId !== prev.activeWorkspaceId || s.widgets !== prev.widgets || s.sessions !== prev.sessions || s.favorites !== prev.favorites ||
        s.routines !== prev.routines || s.dock !== prev.dock || s.records !== prev.records || s.recentWidgetTypes !== prev.recentWidgetTypes || s.sync !== prev.sync;
      if (!changed) return;
      prev = persistedSnapshot();
      dirty = true;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void flush(), 300);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [hydrated]);

  useEffect(() => applyTheme(themeId), [themeId]);
  useEffect(() => setAudioSettings(volume, muted), [volume, muted]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
  }, [reduced]);

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center" role="status">
        <p className="animate-pulse text-lg font-bold text-ink-soft">Loading your Sidekick…</p>
      </div>
    );
  }
  return (
    <>
      <AppShell />
      <TimerEngine />
      <ReminderEngine />
      <Shortcuts />
    </>
  );
}
