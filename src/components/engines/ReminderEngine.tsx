"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { playSound } from "@/lib/audio";
import { dayKey, minutesNow, parseHM } from "@/lib/time";
import { reminderDue, sortedPeriods, type Period, type ReminderItem } from "@/lib/schedule";

/** Fires private teacher reminders and schedule transition warnings. */
export function checkReminders(now = new Date()) {
  const s = useSidekick.getState();
  const today = dayKey(now);
  const allPeriods: Period[] = Object.values(s.widgets)
    .filter((w) => w.type === "schedule" && !w.removedAt)
    .flatMap((w) => (w.config.periods as Period[]) ?? []);

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
          s.setSession(w.id, { fired });
        }
      }
    }
  }
}

export function ReminderEngine() {
  useEffect(() => {
    checkReminders();
    const t = setInterval(() => checkReminders(), 15000);
    return () => clearInterval(t);
  }, []);
  return null;
}
