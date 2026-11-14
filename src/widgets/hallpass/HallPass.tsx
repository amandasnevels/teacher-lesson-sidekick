"use client";
import { useMemo, useState } from "react";
import { Clock3, Download, LogIn, LogOut, Plus, ScrollText, Trash2, X } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useActiveClass, useConfig, useNow } from "@/store/hooks";
import { DEFAULT_DESTINATIONS, DESTINATION_EMOJI, filterLog, formatClock, formatElapsed, isOverdue, logToCSV, minutesOut, type LogRange } from "@/lib/hallpass";
import type { HallPassData, HallPassEntry } from "@/lib/types";
import { Button, Field, IconButton, Modal, Segmented, Toggle, cx, inputCls, useConfirm } from "@/components/ui";
import { RosterGate } from "../RosterGate";
import { accentStyle } from "@/components/WidgetFrame";
import type { WidgetModule, WidgetProps } from "../types";

export interface HallPassConfig {
  destinations: string[];
  display: "count" | "names";
  reminderOn: boolean;
  reminderMinutes: number;
  reminderSound: boolean;
}

const EMPTY: HallPassData = { out: [], log: [] };
const emoji = (d: string) => DESTINATION_EMOJI[d] ?? "📍";

function useHall() {
  const cls = useActiveClass();
  const data = useSidekick((s) => (cls ? s.records.hallpass?.[cls.id] : undefined)) ?? EMPTY;
  return { cls, data };
}

function Body({ id, view }: WidgetProps) {
  return (
    <RosterGate>
      <Inner id={id} big={view === "expanded"} />
    </RosterGate>
  );
}

function Inner({ id, big }: { id: string; big: boolean }) {
  const [c] = useConfig<HallPassConfig>(id);
  const color = useSidekick((s) => s.widgets[id]?.color ?? "teal");
  const { cls, data } = useHall();
  const [dialog, setDialog] = useState<null | "out" | "in" | "log">(null);
  useNow(1000, data.out.length > 0);
  const now = Date.now();
  const reminder = c.reminderOn ? c.reminderMinutes : 0;
  const overdue = data.out.filter((e) => isOverdue(e, reminder, now)).length;
  if (!cls) return null;

  return (
    <div className="space-y-3">
      <div className={cx("rounded-2xl px-3 py-3 text-center", overdue ? "bg-[#ffe5e6] text-[#8a1c20]" : "bg-soft")} aria-live="polite">
        <p className={cx("big-digits font-black leading-none", big ? "text-8xl" : "text-5xl")} data-testid="hall-count">
          {data.out.length}
        </p>
        <p className="mt-1 text-sm font-bold">{data.out.length === 1 ? "student out of the room" : "students out of the room"}</p>
        {overdue > 0 && <p className="mt-1 text-xs font-black uppercase">⏰ {overdue} past {c.reminderMinutes} min</p>}
      </div>

      {c.display === "names" && data.out.length > 0 && (
        <ul className="space-y-1" data-testid="hall-names">
          {data.out.map((e) => {
            const late = isOverdue(e, reminder, now);
            return (
              <li key={e.id} className={cx("flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm", late ? "bg-[#ffe5e6] text-[#8a1c20]" : "bg-soft")}>
                <span aria-hidden>{emoji(e.destination)}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{e.name}</span>
                <span className="shrink-0 text-xs font-semibold">{e.destination}</span>
                <span className="big-digits w-11 shrink-0 text-right text-xs font-black">{formatElapsed(minutesOut(e, now))}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="accent" size={big ? "lg" : "md"} onClick={() => setDialog("out")}>
          <LogOut size={18} /> Check out
        </Button>
        <Button variant="outline" size={big ? "lg" : "md"} onClick={() => setDialog("in")} disabled={data.out.length === 0}>
          <LogIn size={18} /> Check in
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => setDialog("log")}>
        <ScrollText size={14} /> Out-of-room log
      </Button>

      {dialog === "out" && <CheckOutDialog id={id} style={accentStyle(color)} onClose={() => setDialog(null)} />}
      {dialog === "in" && <CheckInDialog id={id} style={accentStyle(color)} onClose={() => setDialog(null)} />}
      {dialog === "log" && <LogDialog style={accentStyle(color)} onClose={() => setDialog(null)} />}
    </div>
  );
}

/** Names on one side, destinations on the other: tap a name, then a place. */
function CheckOutDialog({ id, onClose, style }: { id: string; onClose: () => void; style: React.CSSProperties }) {
  const [c, set] = useConfig<HallPassConfig>(id);
  const { cls, data } = useHall();
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPlace, setNewPlace] = useState("");
  const destinations = c.destinations?.length ? c.destinations : DEFAULT_DESTINATIONS;
  if (!cls) return null;
  const outIds = new Set(data.out.map((e) => e.studentId));
  const pickedName = cls.students.find((s) => s.id === picked)?.name;

  const go = (dest: string) => {
    if (!picked) return;
    const ok = useSidekick.getState().hallCheckOut(cls.id, picked, dest);
    if (ok) {
      useSidekick.getState().toast({ message: `${pickedName} → ${dest}`, tone: "success", actionLabel: "Undo", onAction: () => useSidekick.getState().undo(), timeout: 4000 });
      onClose();
    }
  };
  const addPlace = () => {
    const v = newPlace.trim().slice(0, 24);
    if (!v) return;
    if (!destinations.some((d) => d.toLowerCase() === v.toLowerCase())) set({ destinations: [...destinations, v] });
    setNewPlace("");
    setAdding(false);
  };

  return (
    <Modal open onClose={onClose} title="Check out" panelStyle={style}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-black uppercase text-ink-soft">1 · Student</p>
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto pr-1" role="listbox" aria-label="Students">
            {cls.students.map((s) => {
              const out = outIds.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={picked === s.id}
                    disabled={out}
                    onClick={() => setPicked(s.id)}
                    className={cx(
                      "flex min-h-10 w-full items-center gap-1 rounded-xl px-2 text-left text-sm font-bold transition",
                      picked === s.id ? "bg-brand text-brand-ink" : "bg-black/5 hover:bg-black/10 dark:bg-white/10",
                      out && "opacity-45",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {out && <span className="shrink-0 text-[10px] font-black uppercase">Out</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-black uppercase text-ink-soft">2 · Where</p>
          <div className="space-y-1.5">
            {destinations.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!picked}
                onClick={() => go(d)}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-accent px-3 text-left font-bold text-on-accent shadow-sm transition active:scale-95 disabled:opacity-40"
              >
                <span aria-hidden className="text-lg">{emoji(d)}</span>
                <span className="min-w-0 truncate">{d}</span>
              </button>
            ))}
            {adding ? (
              <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); addPlace(); }}>
                <input autoFocus className={cx(inputCls, "min-h-10")} value={newPlace} maxLength={24} onChange={(e) => setNewPlace(e.target.value)} placeholder="e.g. Library" aria-label="New place" />
                <div className="flex gap-1">
                  <Button type="submit" size="sm" variant="primary" disabled={!newPlace.trim()}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border-2 border-dashed border-line px-3 text-sm font-bold text-ink-soft hover:text-ink">
                <Plus size={16} /> Add place
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-soft">{pickedName ? `Where is ${pickedName} going?` : "Pick a student first."}</p>
        </div>
      </div>
    </Modal>
  );
}

/** One tap per student to check them back in. */
function CheckInDialog({ id, onClose, style }: { id: string; onClose: () => void; style: React.CSSProperties }) {
  const [c] = useConfig<HallPassConfig>(id);
  const { cls, data } = useHall();
  useNow(1000);
  if (!cls) return null;
  const now = Date.now();
  const st = useSidekick.getState;
  return (
    <Modal
      open
      onClose={onClose}
      title="Check in"
      panelStyle={style}
      footer={
        data.out.length > 1 ? (
          <Button variant="outline" onClick={() => { st().hallCheckInAll(cls.id); onClose(); }}>Check in all ({data.out.length})</Button>
        ) : undefined
      }
    >
      {data.out.length === 0 ? (
        <p className="py-4 text-center font-bold">🎉 Everyone is back in the room.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.out.map((e) => {
            const late = isOverdue(e, c.reminderOn ? c.reminderMinutes : 0, now);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    st().hallCheckIn(cls.id, e.id);
                    if (data.out.length === 1) onClose();
                  }}
                  className={cx("flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left transition active:scale-[.98]", late ? "bg-[#ffe5e6] text-[#8a1c20]" : "bg-black/5 hover:bg-black/10 dark:bg-white/10")}
                  aria-label={`Check in ${e.name}`}
                >
                  <span className="text-2xl" aria-hidden>{emoji(e.destination)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">{e.name}</span>
                    <span className="block text-xs font-semibold">{e.destination} · out at {formatClock(e.outAt)}</span>
                  </span>
                  <span className="big-digits shrink-0 font-black">{formatElapsed(minutesOut(e, now))}</span>
                  <LogIn size={18} className="shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function LogDialog({ onClose, style }: { onClose: () => void; style: React.CSSProperties }) {
  const { cls, data } = useHall();
  const [range, setRange] = useState<LogRange>("today");
  const [student, setStudent] = useState<string>("");
  const [confirmEl, ask] = useConfirm();
  const rows = useMemo(() => filterLog(data.log, range, student || null), [data.log, range, student]);
  if (!cls) return null;
  const names = Array.from(new Map(data.log.map((e) => [e.studentId, e.name])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const total = rows.reduce((sum, e) => sum + minutesOut(e), 0);

  const exportCSV = () => {
    const blob = new Blob([logToCSV(rows, cls.name)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hall-pass-${cls.name.replace(/[^\w-]+/g, "-")}-${range}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Modal open onClose={onClose} title={`Out-of-room log · ${cls.name}`} wide panelStyle={style}>
      {confirmEl}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Time range" value={range} onChange={setRange} options={[{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "all", label: "All" }]} />
          <select className={cx(inputCls, "min-h-10 w-auto")} value={student} onChange={(e) => setStudent(e.target.value)} aria-label="Filter by student">
            <option value="">All students</option>
            {names.map(([sid, n]) => (
              <option key={sid} value={sid}>{n}</option>
            ))}
          </select>
        </div>
        <p className="text-sm font-semibold" data-testid="hall-log-summary">
          {rows.length} trip{rows.length === 1 ? "" : "s"} · {Math.round(total)} min total
        </p>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">No trips logged for this view yet. Trips appear here when students are checked back in.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="hall-log">
              <thead className="text-xs uppercase text-ink-soft">
                <tr>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Student</th>
                  <th className="py-1 pr-2">Where</th>
                  <th className="py-1 pr-2">Out</th>
                  <th className="py-1 pr-2">In</th>
                  <th className="py-1 text-right">Min</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="whitespace-nowrap py-1.5 pr-2">{new Date(e.outAt).toLocaleDateString([], { month: "short", day: "numeric" })}</td>
                    <td className="py-1.5 pr-2 font-bold">{e.name}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2">{emoji(e.destination)} {e.destination}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2">{formatClock(e.outAt)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-2">{e.inAt ? formatClock(e.inAt) : "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{Math.round(minutesOut(e))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={exportCSV} disabled={rows.length === 0}><Download size={14} /> Export CSV</Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={data.log.length === 0}
            onClick={async () => {
              if (await ask(`Clear the whole out-of-room log for ${cls.name}? You can undo right after.`, "Clear log")) useSidekick.getState().hallClearLog(cls.id);
            }}
          >
            <Trash2 size={14} /> Clear log
          </Button>
        </div>
        <p className="text-xs text-ink-soft">🔒 The log is saved only on this device with your other class records. Exported files contain student names; store them safely.</p>
      </div>
    </Modal>
  );
}

function Mini() {
  const { data } = useHall();
  return <span className="text-xs font-black" data-testid="hall-mini">{data.out.length} out</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<HallPassConfig>(id);
  const destinations = c.destinations?.length ? c.destinations : DEFAULT_DESTINATIONS;
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Widget shows">
        <Segmented label="Widget shows" value={c.display} onChange={(display) => set({ display })} options={[{ value: "count", label: "Count only" }, { value: "names", label: "Names & places" }]} />
      </Field>
      <Toggle checked={c.reminderOn} onChange={(reminderOn) => set({ reminderOn })} label="Remind me if a student isn’t back" />
      {c.reminderOn && (
        <>
          <Field label="Remind after">
            <Segmented label="Remind after" value={c.reminderMinutes} onChange={(reminderMinutes) => set({ reminderMinutes })} options={[3, 5, 7, 10, 15].map((n) => ({ value: n, label: `${n} min` }))} />
          </Field>
          <Toggle checked={c.reminderSound} onChange={(reminderSound) => set({ reminderSound })} label="Play a sound with the reminder" />
        </>
      )}
      <Field label="Places">
        <ul className="space-y-1">
          {destinations.map((d) => (
            <li key={d} className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-1 font-semibold dark:bg-white/10">
              <span aria-hidden>{emoji(d)}</span>
              <span className="flex-1">{d}</span>
              <IconButton size="sm" label={`Remove ${d}`} disabled={destinations.length <= 1} onClick={() => set({ destinations: destinations.filter((x) => x !== d) })}>
                <X size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      </Field>
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const v = draft.trim().slice(0, 24); if (v && !destinations.includes(v)) set({ destinations: [...destinations, v] }); setDraft(""); }}>
        <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a place, e.g. Library" aria-label="Add a place" />
        <Button type="submit" variant="accent" disabled={!draft.trim()}>Add</Button>
      </form>
      <p className="flex items-center gap-1 text-xs text-ink-soft"><Clock3 size={12} /> Reminders appear even when this widget is collapsed.</p>
    </div>
  );
}

const HallPassWidget: WidgetModule = { Body, Mini, Settings };
export default HallPassWidget;
