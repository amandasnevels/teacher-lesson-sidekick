"use client";
import { useEffect } from "react";
import { useSidekick, persistedSnapshot } from "@/store/store";
import { loadState } from "@/store/persist";
import { flush, markDirty, pauseSaving } from "@/store/autosave";
import { useSingleWindow } from "./engines/SingleWindow";
import { applyTheme } from "@/lib/themes";
import { setAudioSettings } from "@/lib/audio";
import { useReducedMotion } from "@/store/hooks";
import { onRestore, type TimerSession } from "@/widgets/timer/timerLogic";
import { AppShell } from "./AppShell";
import { TimerEngine } from "./engines/TimerEngine";
import { ReminderEngine } from "./engines/ReminderEngine";
import { Shortcuts } from "./engines/Shortcuts";

export default function App() {
  const hydrated = useSidekick((s) => s.hydrated);
  const themeId = useSidekick((s) => s.prefs.themeId);
  const volume = useSidekick((s) => s.prefs.volume);
  const muted = useSidekick((s) => s.prefs.muted);
  const reduced = useReducedMotion();
  const otherWindow = useSingleWindow(hydrated, pauseSaving);

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
      markDirty();
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
      <div className="flex h-screen-safe items-center justify-center" role="status">
        <p className="animate-pulse text-lg font-bold text-ink-soft">Loading your Sidekick…</p>
      </div>
    );
  }
  return (
    <>
      {otherWindow && <PausedOverlay />}
      <AppShell />
      <TimerEngine />
      <ReminderEngine />
      <Shortcuts />
    </>
  );
}

/** Shown when Sidekick was opened in another window; this one stops saving until reclaimed. */
function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/95 p-4 backdrop-blur" role="alertdialog" aria-modal="true" aria-labelledby="paused-title">
      <div className="max-w-sm space-y-3 rounded-3xl border border-line bg-card p-5 text-center shadow-2xl">
        <p className="text-4xl" aria-hidden>🪟</p>
        <h2 id="paused-title" className="text-lg font-black">Sidekick is open in another window</h2>
        <p className="text-sm text-ink-soft">To keep your changes from mixing up, this window is paused. You can close it, or switch back to using Sidekick here.</p>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-brand px-4 font-bold text-brand-ink">
          Use Sidekick here instead
        </button>
      </div>
    </div>
  );
}
