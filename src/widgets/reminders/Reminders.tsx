"use client";
import { useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useSidekick } from "@/store/store";
import { useConfig } from "@/store/hooks";
import { uid } from "@/lib/ids";
import { formatHM } from "@/lib/time";
import { reminderMinute, type Period, type ReminderItem } from "@/lib/schedule";
import { Button, IconButton, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

function useAllPeriods(): Period[] {
  return useSidekick(
    useShallow((s) =>
      Object.values(s.widgets)
        .filter((w) => w.type === "schedule" && !w.removedAt)
        .flatMap((w) => (w.config.periods as Period[]) ?? []),
    ),
  );
}

function Body({ id }: WidgetProps) {
  const [c, set] = useConfig<{ items: ReminderItem[] }>(id);
  const periods = useAllPeriods();
  const [text, setText] = useState("");
  const [time, setTime] = useState("10:00");
  const [repeat, setRepeat] = useState<ReminderItem["repeat"]>("once");
  const [audible, setAudible] = useState(false);
  const [periodId, setPeriodId] = useState("");
  const [offset, setOffset] = useState(-5);
  const items = c.items ?? [];

  const add = () => {
    if (!text.trim()) return;
    const item: ReminderItem = { id: uid("rem"), text: text.trim().slice(0, 120), time, repeat, audible, enabled: true, periodId: periodId || null, offset, firedKey: null };
    set({ items: [...items, item] });
    setText("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">🔒 Private to you — reminders pop up only in your Sidekick.</p>
      <ul className="space-y-1">
        {items.length === 0 && <li className="text-sm text-ink-soft">No reminders yet.</li>}
        {items.map((r) => {
          const m = reminderMinute(r, periods);
          return (
            <li key={r.id} className={cx("flex items-center gap-1.5 rounded-xl bg-soft px-2 py-1", !r.enabled && "opacity-50")}>
              <span className="w-16 shrink-0 text-xs font-black tabular-nums">{m != null ? formatHM(((m % 1440) + 1440) % 1440) : "?"}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {r.text}
                <span className="block text-[11px] font-normal text-ink-soft">
                  {r.repeat === "once" ? "Once" : r.repeat === "daily" ? "Every day" : "Weekdays"}
                  {r.periodId ? ` · linked to ${periods.find((p) => p.id === r.periodId)?.name ?? "a period"}` : ""}
                  {r.audible ? " · 🔔" : " · silent"}
                </span>
              </span>
              <IconButton label={r.enabled ? `Pause reminder ${r.text}` : `Enable reminder ${r.text}`} size="md" onClick={() => set({ items: items.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled, firedKey: null } : x)) })}>
                {r.enabled ? <Bell size={16} /> : <BellOff size={16} />}
              </IconButton>
              <IconButton label={`Delete reminder ${r.text}`} size="md" onClick={() => set({ items: items.filter((x) => x.id !== r.id) })}>
                <Trash2 size={16} />
              </IconButton>
            </li>
          );
        })}
      </ul>
      <form className="space-y-2 rounded-xl border-2 border-dashed border-line p-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Remind me to…" aria-label="Reminder text" />
        {periods.length > 0 && (
          <select className={inputCls} value={periodId} onChange={(e) => setPeriodId(e.target.value)} aria-label="Link to schedule period">
            <option value="">At a specific time</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>Linked to {p.name}</option>
            ))}
          </select>
        )}
        {periodId ? (
          <select className={inputCls} value={offset} onChange={(e) => setOffset(Number(e.target.value))} aria-label="When, relative to the period start">
            {[-10, -5, -2, 0, 5, 10].map((o) => (
              <option key={o} value={o}>{o === 0 ? "When it starts" : o < 0 ? `${-o} min before it starts` : `${o} min after it starts`}</option>
            ))}
          </select>
        ) : (
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Reminder time" />
        )}
        <Segmented label="Repeat" value={repeat} onChange={setRepeat} options={[{ value: "once", label: "Once" }, { value: "daily", label: "Daily" }, { value: "weekdays", label: "Weekdays" }]} />
        <Toggle checked={audible} onChange={setAudible} label="Play a sound" />
        <Button type="submit" variant="accent" disabled={!text.trim()} className="w-full">Add reminder</Button>
      </form>
    </div>
  );
}

const RemindersWidget: WidgetModule = { Body };
export default RemindersWidget;
