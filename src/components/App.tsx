"use client";
import { useEffect } from "react";
import { useSidekick, persistedSnapshot } from "@/store/store";
import { answerSessionProbes, currentSessionId, loadState, markReclaim, readLocalPrefs, startSession } from "@/store/persist";
import { createDefaultState } from "@/store/defaults";
import { ensureAllRequired } from "@/store/workspaceLogic";
import { WorkspaceChooser, Walkthrough } from "./WorkspaceChooser";
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
import { HallPassEngine } from "./engines/HallPassEngine";
import { ChampsVoiceSync } from "./engines/ChampsVoiceSync";

export default function App() {
  const hydrated = useSidekick((s) => s.hydrated);
  const themeId = useSidekick((s) => s.prefs.themeId);
  const volume = useSidekick((s) => s.prefs.volume);
  const muted = useSidekick((s) => s.prefs.muted);
  const reduced = useReducedMotion();
  const chooser = useSidekick((s) => s.chooser);
  const otherWindow = useSingleWindow(hydrated && chooser !== "welcome", pauseSaving);

  // Load saved data once.
  useEffect(() => {
    let cancelled = false;
    void loadState().then(async ({ state, recovered }) => {
      if (cancelled) return;
      const st = useSidekick.getState();
      if (state) {
        // Same tab, refreshed: continue this teaching session.
        const now = Date.now();
        // Timers that ran out while the page was away are marked done — never restarted.
        for (const [id, w] of Object.entries(state.widgets)) {
          if (w.type === "timer" && state.sessions[id]) state.sessions[id] = onRestore(state.sessions[id] as TimerSession, now);
        }
        st.hydrate(state, recovered ?? null);
      } else {
        // A new visit: nothing personal is loaded. Show the workspace chooser.
        const base = createDefaultState();
        base.prefs = { ...base.prefs, ...(readLocalPrefs() ?? {}) };
        const url = new URL(window.location.href);
        if (url.searchParams.get("start") === "sample") {
          // Sample workspace for automated tests and demos (no personal data).
          url.searchParams.delete("start");
          window.history.replaceState(null, "", url.toString());
          const sample = ensureAllRequired(base);
          st.hydrate(sample, recovered ?? null);
          await startSession(sample);
        } else {
          st.hydrate(base, recovered ?? null);
          st.openChooser("welcome");
        }
      }
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
        s.routines !== prev.routines || s.dock !== prev.dock || s.records !== prev.records || s.recentWidgetTypes !== prev.recentWidgetTypes || s.sync !== prev.sync || s.taught !== prev.taught;
      if (!changed) return;
      prev = persistedSnapshot();
      markDirty();
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    // Keep this tab's session marked as active (sessions idle for 12 hours start fresh).
    const beat = setInterval(() => {
      if (document.visibilityState === "visible" && currentSessionId()) {
        markDirty();
      }
    }, 5 * 60 * 1000);
    const stopProbes = answerSessionProbes();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsub();
      clearInterval(beat);
      stopProbes();
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
  if (chooser === "welcome") return <WorkspaceChooser mode="welcome" />;
  return (
    <>
      {otherWindow && <PausedOverlay />}
      <AppShell />
      {chooser === "switch" && <WorkspaceChooser mode="switch" />}
      <Walkthrough />
      <TimerEngine />
      <ReminderEngine />
      <Shortcuts />
      <HallPassEngine />
      <ChampsVoiceSync />
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
        <button
          type="button"
          onClick={() => {
            markReclaim();
            window.location.reload();
          }} className="min-h-11 rounded-xl bg-brand px-4 font-bold text-brand-ink">
          Use Sidekick here instead
        </button>
      </div>
    </div>
  );
}
