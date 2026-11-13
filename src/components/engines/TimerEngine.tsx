"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { playSound, isSoundId } from "@/lib/audio";
import { DEFINITIONS } from "@/widgets/definitions";
import { advance, type TimerConfig, type TimerSession } from "@/widgets/timer/timerLogic";

/**
 * One app-wide loop that finishes timers — even collapsed ones or ones in another workspace.
 * Widgets only render the remaining time; they never own the countdown.
 */
export function checkTimers(now = Date.now()) {
  const s = useSidekick.getState();
  for (const w of Object.values(s.widgets)) {
    if (w.type !== "timer" || w.removedAt) continue;
    const sess = s.sessions[w.id] as TimerSession | undefined;
    if (!sess || sess.status !== "running" || sess.endAt == null || sess.endAt > now) continue;
    const cfg = w.config as unknown as TimerConfig;
    const { session, event } = advance(sess, cfg, now);
    s.setSession(w.id, session);
    const name = w.title || DEFINITIONS.timer.name;
    if (event === "station") {
      playSound("ding");
      const names = cfg.stations.names.filter((n) => n.trim());
      s.toast({ message: `🔄 Rotate! Next: ${names[session.station] ?? ""}`, tone: "info", timeout: 5000 });
    } else if (event === "repeat" || event === "done") {
      if (cfg.soundOn && isSoundId(cfg.sound)) playSound(cfg.sound);
      if (event === "done") s.toast({ message: `⏰ ${name}: time’s up!`, tone: "success", timeout: 8000 });
    }
  }
}

export function TimerEngine() {
  useEffect(() => {
    const t = setInterval(() => checkTimers(), 250);
    const onVis = () => checkTimers();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
