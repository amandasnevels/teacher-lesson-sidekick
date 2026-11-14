"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { playSound } from "@/lib/audio";
import { dueReminders } from "@/lib/hallpass";
import type { HallPassData } from "@/lib/types";
import type { HallPassConfig } from "@/widgets/hallpass/HallPass";

/** Reminds the teacher once per trip when a student has been out longer than the chosen time. */
export function checkHallPasses(now = Date.now()) {
  const s = useSidekick.getState();
  const widget = Object.values(s.widgets).find((w) => w.type === "hallpass" && !w.removedAt);
  if (!widget) return;
  const cfg = widget.config as unknown as HallPassConfig;
  if (!cfg.reminderOn || !cfg.reminderMinutes) return;
  for (const [classId, data] of Object.entries(s.records.hallpass ?? {}) as [string, HallPassData][]) {
    for (const e of dueReminders(data.out, cfg.reminderMinutes, now)) {
      s.hallMarkReminded(classId, e.id);
      if (cfg.reminderSound) playSound("ding");
      const cls = s.classes.find((c) => c.id === classId);
      s.toast({
        message: `⏰ ${e.name} has been at ${e.destination} for ${cfg.reminderMinutes}+ min${cls && classId !== s.activeClassId ? ` (${cls.name})` : ""}`,
        tone: "warn",
        actionLabel: "Check in",
        onAction: () => useSidekick.getState().hallCheckIn(classId, e.id),
        timeout: 20000,
      });
    }
  }
}

export function HallPassEngine() {
  useEffect(() => {
    checkHallPasses();
    const t = setInterval(() => checkHallPasses(), 5000);
    return () => clearInterval(t);
  }, []);
  return null;
}
