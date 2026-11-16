"use client";
import { Plus, Trash2, Volume2 } from "lucide-react";
import { useConfig, useNow, useSelectValue } from "@/store/hooks";
import { SOUNDS, playSound, speak } from "@/lib/audio";
import type { SoundId } from "@/lib/types";
import { formatHM, minutesNow, parseHM } from "@/lib/time";
import { formatDuration } from "@/lib/time";
import { endMessage, scheduleAt, sortedPeriods, type Period } from "@/lib/schedule";
import { uid } from "@/lib/ids";
import { Button, Field, IconButton, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export interface ScheduleConfig {
  periods: Period[];
  remindMinutes: number;
  remindSound: boolean;
  use24h: boolean;
  /** Switch the Active Class to the period's class when it starts. */
  autoClass?: boolean;
  /** What happens when a period ends. */
  endAlert?: "off" | "sound" | "voice" | "both";
  endSound?: SoundId;
  /** Spoken at the end of a period; {period} = the period's name. */
  endText?: string;
}

const useClassList = () => useSelectValue((s) => s.classes.map((c) => ({ id: c.id, name: c.name })));

/** Compact class picker shown next to each period's time. */
function ClassChip({ period, onChange, active }: { period: Period; onChange: (classId: string | null) => void; active: boolean }) {
  const classes = useClassList();
  if (!classes.length) return null;
  return (
    <select
      className={cx("h-7 max-w-[7.5rem] shrink-0 truncate rounded-lg border px-1 text-xs font-bold", active ? "border-white/60 bg-white/20 text-current" : "border-line bg-card text-ink")}
      value={period.classId ?? ""}
      aria-label={`Class for ${period.name}`}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">No class</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<ScheduleConfig>(id);
  useNow(1000);
  const nowMin = minutesNow();
  const setClass = (pid: string, classId: string | null) => set({ periods: c.periods.map((p) => (p.id === pid ? { ...p, classId } : p)) });
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
              <li key={p.id} className={cx("flex items-center justify-between gap-2 rounded-lg px-2 py-1", isNow && "bg-accent font-bold text-on-accent", past && !isNow && "text-ink-soft")}>
                <span className={cx("min-w-0 flex-1 truncate", past && !isNow && "line-through")}>{p.name}</span>
                <span className="shrink-0 tabular-nums">{formatHM(parseHM(p.start)!, c.use24h)}–{formatHM(parseHM(p.end)!, c.use24h)}</span>
                <ClassChip period={p} active={isNow} onChange={(cid) => setClass(p.id, cid)} />
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
  const classes = useClassList();
  const alert = c.endAlert ?? "off";
  const test = () => {
    const p = c.periods[0] ?? { id: "x", name: "Math", start: "09:00", end: "10:00" };
    if (alert === "sound" || alert === "both") playSound(c.endSound ?? "bell");
    if (alert === "voice" || alert === "both") setTimeout(() => speak(endMessage(c.endText ?? "", p)), alert === "both" ? 1200 : 0);
  };
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
            {classes.length > 0 && (
              <select className={inputCls} value={p.classId ?? ""} aria-label={`${p.name} class`} onChange={(e) => update(p.id, { classId: e.target.value || null })}>
                <option value="">No class (keep the current Active Class)</option>
                {classes.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    Active Class: {cl.name}
                  </option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={() => set({ periods: [...c.periods, { id: uid("p"), name: "New period", start: "12:00", end: "12:45" }] })}><Plus size={14} /> Add period</Button>
      <Field label="Transition reminder (minutes before; 0 = off)">
        <input type="number" min={0} max={30} className={inputCls} value={c.remindMinutes} onChange={(e) => set({ remindMinutes: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} />
      </Field>
      <Toggle checked={c.remindSound} onChange={(remindSound) => set({ remindSound })} label="Play a chime with transition reminders" />
      <Toggle checked={c.use24h} onChange={(use24h) => set({ use24h })} label="24-hour times" />
      <Toggle
        checked={c.autoClass !== false}
        onChange={(autoClass) => set({ autoClass })}
        label="Switch the Active Class automatically"
        description="When a period with a class starts, Sidekick changes the Active Class (your workspace stays the same)."
      />
      <Field label="When a period ends">
        <Segmented
          label="When a period ends"
          value={alert}
          onChange={(endAlert) => set({ endAlert })}
          options={[
            { value: "off", label: "Nothing" },
            { value: "sound", label: "Sound" },
            { value: "voice", label: "Voice" },
            { value: "both", label: "Both" },
          ]}
        />
      </Field>
      {(alert === "sound" || alert === "both") && (
        <Field label="End-of-period sound">
          <select className={inputCls} value={c.endSound ?? "bell"} onChange={(e) => set({ endSound: e.target.value as SoundId })}>
            {SOUNDS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {(alert === "voice" || alert === "both") && (
        <Field label="Spoken message ({period} = period name)">
          <input className={inputCls} value={c.endText ?? ""} maxLength={200} onChange={(e) => set({ endText: e.target.value })} placeholder="{period} is over." />
        </Field>
      )}
      {alert !== "off" && (
        <Button variant="outline" size="sm" onClick={test}>
          <Volume2 size={14} /> Test it
        </Button>
      )}
    </div>
  );
}

const ScheduleWidget: WidgetModule = { Body, Mini, Settings };
export default ScheduleWidget;
