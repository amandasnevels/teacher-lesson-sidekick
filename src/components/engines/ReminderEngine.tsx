"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { playSound, speak } from "@/lib/audio";
import { dayKey, minutesNow, parseHM } from "@/lib/time";
import { dueScheduleEvents, endMessage, reminderDue, sortedPeriods, type Period, type ReminderItem } from "@/lib/schedule";
import type { SoundId } from "@/lib/types";

/** Fires private teacher reminders and schedule transition warnings. */
export function checkReminders(now = new Date()) {
  const s = useSidekick.getState();
  const today = dayKey(now);
  const allPeriods: Period[] = Object.values(s.widgets)
    .filter((w) => w.type === "schedule" && !w.removedAt)
    .flatMap((w) => (w.config.periods as Period[]) ?? []);

  // Several schedule widgets (e.g. in different workspaces) can list the same period: act once.
  const handled = new Set<string>();
  for (const w of Object.values(s.widgets)) {
    if (w.removedAt) continue;
    if (w.type === "reminders") {
      const items = (w.config.items as ReminderItem[]) ?? [];
      let changed = false;
      const next = items.map((r) => {
        if (!reminderDue(r, allPeriods, now, today)) return r;
        changed = true;
        if (r.audible) playSound("chime");
        s.toast({ message: `⏰ Reminder: ${r.text}`, tone: "info", timeout: 15000 });
        return { ...r, firedKey: today, enabled: r.repeat === "once" ? false : r.enabled };
      });
      if (changed) s.updateConfig(w.id, { items: next });
    }
    if (w.type === "schedule") {
      runPeriodEvents(w.id, w.config, today, now, handled);
      const remind = Number(w.config.remindMinutes ?? 0);
      if (!remind) continue;
      const nowMin = minutesNow(now);
      const sess = (s.sessions[w.id] as { fired?: string[] } | undefined) ?? {};
      const fired = (sess.fired ?? []).filter((k) => k.startsWith(today));
      for (const p of sortedPeriods((w.config.periods as Period[]) ?? [])) {
        const end = parseHM(p.end)!;
        const key = `${today}:${p.id}:end`;
        if (fired.includes(key)) continue;
        if (nowMin >= end - remind && nowMin < end) {
          fired.push(key);
          if (w.config.remindSound) playSound("chime");
          s.toast({ message: `🔔 ${p.name} ends in ${Math.ceil(end - nowMin)} min`, tone: "info", timeout: 10000 });
          s.setSession(w.id, { ...((useSidekick.getState().sessions[w.id] as object) ?? {}), fired });
        }
      }
    }
  }
}

/** Period start → switch the Active Class; period end → sound and/or spoken announcement. */
function runPeriodEvents(widgetId: string, config: Record<string, unknown>, today: string, now: Date, handled: Set<string>) {
  const s = useSidekick.getState();
  const sess = (s.sessions[widgetId] as { fired?: string[]; events?: string[] } | undefined) ?? {};
  const fired = (sess.events ?? []).filter((k) => k.startsWith(today));
  const due = dueScheduleEvents((config.periods as Period[]) ?? [], minutesNow(now), today, fired);
  if (!due.length) return;
  for (const ev of due) {
    fired.push(ev.key);
    const p = ev.period;
    const dedupe = `${ev.kind}:${ev.kind === "start" ? p.start : p.end}`;
    if (handled.has(dedupe)) continue;
    handled.add(dedupe);
    if (ev.kind === "start" && p.classId && config.autoClass !== false) {
      const st = useSidekick.getState();
      const cls = st.classes.find((c) => c.id === p.classId);
      if (cls && st.activeClassId !== cls.id) {
        st.setActiveClass(cls.id);
        st.toast({ message: `📅 ${p.name}: now teaching ${cls.name}`, tone: "info", timeout: 8000 });
      }
    }
    if (ev.kind === "end") {
      const mode = (config.endAlert as string) ?? "off";
      if (mode === "sound" || mode === "both") playSound(((config.endSound as SoundId) ?? "bell"));
      if (mode === "voice" || mode === "both") {
        const text = endMessage(String(config.endText ?? ""), p);
        // Let the sound ring first.
        if (mode === "both") setTimeout(() => speak(text), 1200);
        else speak(text);
      }
      if (mode !== "off") useSidekick.getState().toast({ message: `🔔 ${p.name} is over`, tone: "info", timeout: 8000 });
    }
  }
  const latest = (useSidekick.getState().sessions[widgetId] as object | undefined) ?? {};
  useSidekick.getState().setSession(widgetId, { ...latest, events: fired });
}

export function ReminderEngine() {
  useEffect(() => {
    checkReminders();
    const t = setInterval(() => checkReminders(), 15000);
    return () => clearInterval(t);
  }, []);
  return null;
}
