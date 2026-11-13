"use client";
import { Plus, Trash2 } from "lucide-react";
import { useConfig, useNow } from "@/store/hooks";
import { formatHM, minutesNow, parseHM } from "@/lib/time";
import { formatDuration } from "@/lib/time";
import { scheduleAt, sortedPeriods, type Period } from "@/lib/schedule";
import { uid } from "@/lib/ids";
import { Button, Field, IconButton, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export interface ScheduleConfig {
  periods: Period[];
  remindMinutes: number;
  remindSound: boolean;
  use24h: boolean;
}

function Body({ id, view }: WidgetProps) {
  const [c] = useConfig<ScheduleConfig>(id);
  useNow(1000);
  const nowMin = minutesNow();
  const s = scheduleAt(c.periods, nowMin);
  const list = sortedPeriods(c.periods);
  const big = view === "expanded";
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-soft p-3 text-center">
        <p className="text-xs font-black uppercase tracking-wide text-ink-soft">{s.current ? "Now" : "Between periods"}</p>
        <p className={cx("font-black", big ? "text-5xl" : "text-2xl")} data-testid="schedule-current">{s.current?.name ?? (s.next ? "Free time" : "Schedule finished")}</p>
        {s.minutesToTransition != null && (
          <p className={cx("font-bold", big ? "text-3xl" : "text-lg")}>
            {s.transitionLabel} in <span className="big-digits">{formatDuration(s.minutesToTransition * 60000)}</span>
          </p>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-ink-soft">Add your periods in More Settings.</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {list.map((p) => {
            const isNow = p.id === s.current?.id;
            const past = parseHM(p.end)! <= nowMin;
            return (
              <li key={p.id} className={cx("flex justify-between gap-2 rounded-lg px-2 py-1", isNow && "bg-accent font-bold text-on-accent", past && !isNow && "text-ink-soft line-through")}>
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums">{formatHM(parseHM(p.start)!, c.use24h)}–{formatHM(parseHM(p.end)!, c.use24h)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<ScheduleConfig>(id);
  useNow(1000);
  const s = scheduleAt(c.periods, minutesNow());
  return <span className="text-xs font-bold">{s.minutesToTransition != null ? `${formatDuration(s.minutesToTransition * 60000)}` : "—"}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<ScheduleConfig>(id);
  const update = (pid: string, patch: Partial<Period>) => set({ periods: c.periods.map((p) => (p.id === pid ? { ...p, ...patch } : p)) });
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {c.periods.map((p) => (
          <li key={p.id} className="space-y-1 rounded-xl border-2 border-line p-2">
            <div className="flex gap-1.5">
              <input className={inputCls} value={p.name} aria-label="Period name" onChange={(e) => update(p.id, { name: e.target.value })} />
              <IconButton label={`Delete ${p.name}`} onClick={() => set({ periods: c.periods.filter((x) => x.id !== p.id) })}><Trash2 size={16} /></IconButton>
            </div>
            <div className="flex gap-1.5">
              <input type="time" className={inputCls} value={p.start} aria-label={`${p.name} start`} onChange={(e) => update(p.id, { start: e.target.value })} />
              <input type="time" className={inputCls} value={p.end} aria-label={`${p.name} end`} onChange={(e) => update(p.id, { end: e.target.value })} />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={() => set({ periods: [...c.periods, { id: uid("p"), name: "New period", start: "12:00", end: "12:45" }] })}><Plus size={14} /> Add period</Button>
      <Field label="Transition reminder (minutes before; 0 = off)">
        <input type="number" min={0} max={30} className={inputCls} value={c.remindMinutes} onChange={(e) => set({ remindMinutes: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} />
      </Field>
      <Toggle checked={c.remindSound} onChange={(remindSound) => set({ remindSound })} label="Play a chime with transition reminders" />
      <Toggle checked={c.use24h} onChange={(use24h) => set({ use24h })} label="24-hour times" />
    </div>
  );
}

const ScheduleWidget: WidgetModule = { Body, Mini, Settings };
export default ScheduleWidget;
