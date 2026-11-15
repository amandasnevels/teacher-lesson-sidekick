"use client";
import { useEffect, useMemo, useState } from "react";
import { BookCheck, CalendarCheck, Check, Download, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useActiveClass, useConfig } from "@/store/hooks";
import { uid } from "@/lib/ids";
import { TEKS_GRADES, TEKS_SUBJECTS, loadTeks, localDateKey, searchTeks, wordPattern, type TeksData, type TeksItem, type TeksSubject } from "@/lib/teks";
import type { TaughtEntry } from "@/lib/types";
import { accentStyle } from "@/components/WidgetFrame";
import { Button, EmptyState, Field, IconButton, Modal, Segmented, Toggle, cx, inputCls, useConfirm } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export interface ICanItem {
  id: string;
  text: string;
  code?: string | null;
  teksId?: string | null;
  subject?: string | null;
  course?: string | null;
}
export interface ICanConfig {
  heading: string;
  items: ICanItem[];
  fontSize: "md" | "lg" | "xl";
  showCodes: boolean;
  grade: string;
  subject: TeksSubject;
}

const sizes = { md: "text-base", lg: "text-xl", xl: "text-3xl" };

/** "I can" prefix for typed objectives that don't already have one. */
export function normalizeObjective(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/^(i can|we can|students will|swbat|i will)\b/i.test(t)) return t;
  return `I can ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

function toEntry(it: ICanItem, date: string, cls: { id: string; name: string } | null): Omit<TaughtEntry, "id" | "loggedAt"> {
  return { date, text: it.text, teksId: it.teksId ?? null, code: it.code ?? null, subject: it.subject ?? null, course: it.course ?? null, classId: cls?.id ?? null, className: cls?.name ?? null };
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<ICanConfig>(id);
  const color = useSidekick((s) => s.widgets[id]?.color ?? "sky");
  const cls = useActiveClass();
  const today = localDateKey();
  const taughtToday = useSidekick((s) => s.taught);
  const [dialog, setDialog] = useState<null | "search" | "type" | "tracker">(null);
  const [confirmEl, ask] = useConfirm();
  const items = c.items ?? [];
  const big = view === "expanded";
  const loggedToday = (it: ICanItem) => taughtToday.some((t) => t.date === today && (t.teksId ? t.teksId === it.teksId : t.text === it.text) && (t.classId ?? null) === (cls?.id ?? null));
  const st = useSidekick.getState;

  return (
    <div className="space-y-3">
      {confirmEl}
      <p className={cx("font-black uppercase tracking-wide text-ink-soft", big ? "text-2xl" : "text-xs")}>{c.heading || "Today I can…"}</p>
      {items.length === 0 ? (
        <EmptyState emoji="💡" title="Add today’s objectives">
          <p className="text-sm text-ink-soft">Type your own, or search the TEKS by grade, subject and keyword.</p>
        </EmptyState>
      ) : (
        <ol className="space-y-2" data-testid="ican-list">
          {items.map((it) => {
            const done = loggedToday(it);
            return (
              <li key={it.id} className="group flex items-start gap-2 rounded-2xl bg-soft px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className={cx("font-bold leading-snug", big ? "text-4xl" : sizes[c.fontSize] ?? sizes.lg)}>{it.text}</p>
                  {c.showCodes && it.code && (
                    <p className="mt-0.5 text-xs font-black text-ink-soft">
                      TEKS {it.code}
                      {it.course ? ` · ${it.course}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <IconButton
                    size="md"
                    variant={done ? "accent" : "outline"}
                    label={done ? `Logged as taught today: ${it.text}` : `Log as taught today: ${it.text}`}
                    aria-pressed={done}
                    onClick={() => {
                      if (done) return;
                      const n = st().logTaught([toEntry(it, today, cls)]);
                      if (n) st().toast({ message: `📅 Logged as taught today${it.code ? ` (${it.code})` : ""}`, tone: "success", actionLabel: "Undo", onAction: () => st().undo(), timeout: 4000 });
                    }}
                  >
                    {done ? <CalendarCheck size={16} /> : <BookCheck size={16} />}
                  </IconButton>
                  <IconButton size="md" label={`Remove from widget: ${it.text}`} onClick={() => set({ items: items.filter((x) => x.id !== it.id) })}>
                    <X size={16} />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button variant="accent" size="sm" onClick={() => setDialog("search")}>
          <Search size={14} /> Find TEKS
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialog("type")}>
          <Pencil size={14} /> Type my own
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog("tracker")}>
          <CalendarCheck size={14} /> Tracker
        </Button>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={async () => { if (await ask("Clear all objectives from this widget? Your tracker history is kept.", "Clear")) set({ items: [] }); }}>
            <Trash2 size={14} /> Clear
          </Button>
        )}
      </div>
      {dialog === "type" && <TypeDialog id={id} style={accentStyle(color)} onClose={() => setDialog(null)} />}
      {dialog === "search" && <SearchDialog id={id} style={accentStyle(color)} onClose={() => setDialog(null)} />}
      {dialog === "tracker" && <TrackerDialog style={accentStyle(color)} onClose={() => setDialog(null)} />}
    </div>
  );
}

function TypeDialog({ id, style, onClose }: { id: string; style: React.CSSProperties; onClose: () => void }) {
  const [c, set] = useConfig<ICanConfig>(id);
  const [draft, setDraft] = useState("");
  const lines = draft.split(/\r?\n/).map(normalizeObjective).filter(Boolean);
  return (
    <Modal
      open
      onClose={onClose}
      title="Type objectives"
      panelStyle={style}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!lines.length} onClick={() => { set({ items: [...(c.items ?? []), ...lines.map((text) => ({ id: uid("ic"), text: text.slice(0, 400) }))] }); onClose(); }}>
            Add {lines.length || ""}
          </Button>
        </>
      }
    >
      <Field label="One objective per line" hint="“I can” is added for you if you leave it off.">
        <textarea data-autofocus className={cx(inputCls, "min-h-36 py-2")} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={"I can make inferences using text evidence.\nmultiply two-digit numbers"} aria-label="Objectives, one per line" />
      </Field>
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {lines.map((l, i) => <li key={i} className="rounded-lg bg-black/5 px-2 py-1 dark:bg-white/10">{l}</li>)}
        </ul>
      )}
    </Modal>
  );
}

function highlight(text: string, query: string) {
  const pats = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1).map(wordPattern);
  if (!pats.length) return text;
  const re = new RegExp(`(${pats.map((p) => `${p}[a-z]*`).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i} className="rounded bg-[#fff1a8] px-0.5 text-ink">{part}</mark> : part));
}

function SearchDialog({ id, style, onClose }: { id: string; style: React.CSSProperties; onClose: () => void }) {
  const [c, set] = useConfig<ICanConfig>(id);
  const cls = useActiveClass();
  const [data, setData] = useState<TeksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState<string>("");
  const [picked, setPicked] = useState<Record<string, TeksItem>>({});
  const [logIt, setLogIt] = useState(true);
  const [date, setDate] = useState(localDateKey());
  const grade = c.grade ?? "3";
  const subject = c.subject ?? "ela";

  useEffect(() => {
    loadTeks().then(setData).catch(() => setError("The TEKS list couldn’t load. Check your connection and try again."));
  }, []);

  const courses = useMemo(() => (data ? data.courses.filter((x) => x.subject === subject && x.grade === grade) : []), [data, subject, grade]);
  useEffect(() => {
    setCourse(grade === "HS" ? courses[0]?.course ?? "" : "");
  }, [grade, subject, courses]);

  const results = useMemo(() => (data ? searchTeks(data.items, { subject, grade, course: course || null, query }) : []), [data, subject, grade, course, query]);
  const shown = results.slice(0, 150);
  const pickedList = Object.values(picked);

  const toggle = (it: TeksItem) => setPicked((p) => { const n = { ...p }; if (n[it.id]) delete n[it.id]; else n[it.id] = it; return n; });

  const addSelected = () => {
    const st = useSidekick.getState();
    const existing = new Set((c.items ?? []).map((x) => x.teksId).filter(Boolean));
    const add: ICanItem[] = pickedList.filter((t) => !existing.has(t.id)).map((t) => ({ id: uid("ic"), text: t.ican, code: t.code, teksId: t.id, subject: t.subject, course: t.course }));
    set({ items: [...(c.items ?? []), ...add] });
    let logged = 0;
    if (logIt) logged = st.logTaught(pickedList.map((t) => toEntry({ id: "", text: t.ican, code: t.code, teksId: t.id, subject: t.subject, course: t.course }, date, cls)));
    st.toast({ message: `Added ${pickedList.length} I can statement${pickedList.length === 1 ? "" : "s"}${logIt ? ` · ${logged} logged for ${date === localDateKey() ? "today" : date}` : ""}`, tone: "success" });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Find TEKS “I can” statements"
      panelStyle={style}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={logIt} onChange={(e) => setLogIt(e.target.checked)} />
            Log in tracker as taught on
          </label>
          <input type="date" className="min-h-10 rounded-xl border-2 border-line bg-card px-2 text-sm text-ink focus:border-brand focus:outline-none" value={date} onChange={(e) => setDate(e.target.value || localDateKey())} disabled={!logIt} aria-label="Date taught" />
          <span className="flex-1" />
          <Button variant="primary" disabled={!pickedList.length} onClick={addSelected}>
            <Plus size={16} /> Add {pickedList.length || ""} to Sidekick
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Grade">
            <select className={inputCls} value={grade} onChange={(e) => set({ grade: e.target.value })} aria-label="Grade level">
              {TEKS_GRADES.map((g) => <option key={g.value} value={g.value}>{g.value === "HS" ? g.label : g.value === "K" ? "Kindergarten" : `Grade ${g.label}`}</option>)}
            </select>
          </Field>
          {grade === "HS" && (
            <Field label="Course">
              <select className={inputCls} value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Course">
                {courses.map((x) => <option key={x.course} value={x.course}>{x.course}</option>)}
              </select>
            </Field>
          )}
        </div>
        <Segmented label="Subject" value={subject} onChange={(v) => set({ subject: v })} options={TEKS_SUBJECTS.map((s) => ({ value: s.value, label: s.label }))} />
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input data-autofocus className={cx(inputCls, "pl-10")} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a word like infer, multiply, or a code like 3.4K" aria-label="Search TEKS" />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-[#d93036]">{error}</p>}
        {!data && !error && <p className="animate-pulse text-sm text-ink-soft" role="status">Loading TEKS…</p>}
        {data && (
          <>
            <p className="text-xs font-semibold text-ink-soft" data-testid="teks-count" aria-live="polite">
              {results.length} statement{results.length === 1 ? "" : "s"}{results.length > shown.length ? ` (showing first ${shown.length}; type a word to narrow)` : ""}
              {pickedList.length > 0 && ` · ${pickedList.length} selected`}
            </p>
            <ul className="space-y-1.5" data-testid="teks-results">
              {shown.map((it) => {
                const on = !!picked[it.id];
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(it)}
                      className={cx("flex w-full items-start gap-3 rounded-2xl border-2 px-3 py-2 text-left transition", on ? "border-accent bg-soft" : "border-line hover:border-accent/60")}
                    >
                      <span className={cx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2", on ? "border-accent bg-accent text-on-accent" : "border-line")}>
                        {on && <Check size={16} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-ink-soft">{it.code} · {it.strand}</span>
                        <span className="block text-sm font-semibold leading-snug">{highlight(it.ican, query)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && <li className="py-4 text-center text-sm text-ink-soft">No TEKS match “{query}” for this grade and subject. Try a shorter word.</li>}
            </ul>
            <p className="text-[11px] text-ink-soft">Source: {data.source}. Retrieved {data.retrieved}. “I can” wording is generated from each student expectation.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

function csv(entries: TaughtEntry[]) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [["Date", "TEKS", "Course", "Class", "I can statement"], ...entries.map((e) => [e.date, e.code ?? "", e.course ?? "", e.className ?? "", e.text])];
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

function TrackerDialog({ style, onClose }: { style: React.CSSProperties; onClose: () => void }) {
  const taught = useSidekick((s) => s.taught);
  const classes = useSidekick((s) => s.classes);
  const [range, setRange] = useState<"week" | "month" | "all">("month");
  const [classFilter, setClassFilter] = useState("");
  const [coverage, setCoverage] = useState<{ course: string; subject: string } | null>(null);
  const [data, setData] = useState<TeksData | null>(null);
  const st = useSidekick.getState;
  useEffect(() => { loadTeks().then(setData).catch(() => {}); }, []);

  const cutoff = useMemo(() => {
    const d = new Date();
    if (range === "week") d.setDate(d.getDate() - 7);
    else if (range === "month") d.setDate(d.getDate() - 31);
    else return "";
    return localDateKey(d);
  }, [range]);
  const rows = taught
    .filter((t) => (!cutoff || t.date >= cutoff) && (!classFilter || t.classId === classFilter))
    .sort((a, b) => (a.date === b.date ? b.loggedAt - a.loggedAt : a.date < b.date ? 1 : -1));
  const byDate = rows.reduce<Record<string, TaughtEntry[]>>((acc, t) => ((acc[t.date] ??= []).push(t), acc), {});
  const coursesTaught = Array.from(new Set(taught.filter((t) => t.course && t.subject).map((t) => `${t.subject}|${t.course}`))).map((k) => ({ subject: k.split("|")[0], course: k.split("|")[1] }));

  const cov = coverage && data ? (() => {
    const all = data.items.filter((i) => i.subject === coverage.subject && i.course === coverage.course);
    const done = new Set(taught.filter((t) => !classFilter || t.classId === classFilter).map((t) => t.teksId));
    return { all, done: all.filter((i) => done.has(i.id)), todo: all.filter((i) => !done.has(i.id)) };
  })() : null;

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" }));
    a.download = `teks-taught-${localDateKey()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Modal open onClose={onClose} wide title="TEKS taught tracker" panelStyle={style}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Time range" value={range} onChange={setRange} options={[{ value: "week", label: "7 days" }, { value: "month", label: "31 days" }, { value: "all", label: "All" }]} />
          {classes.length > 0 && (
            <select className={cx(inputCls, "min-h-10 w-auto")} value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Class">
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {coursesTaught.length > 0 && (
          <div className="rounded-2xl border-2 border-line p-3">
            <p className="mb-2 text-xs font-black uppercase text-ink-soft">Coverage</p>
            <div className="flex flex-wrap gap-1.5">
              {coursesTaught.map((x) => {
                const on = coverage?.course === x.course && coverage?.subject === x.subject;
                const label = `${x.course} ${({ ela: "ELAR", math: "Math", science: "Science", social: "Social Studies" } as Record<string, string>)[x.subject] ?? ""}`;
                return <button key={`${x.subject}|${x.course}`} type="button" aria-pressed={on} onClick={() => setCoverage(on ? null : x)} className={cx("min-h-9 rounded-full px-3 text-xs font-bold", on ? "bg-accent text-on-accent" : "bg-black/5 dark:bg-white/10")}>{label}</button>;
              })}
            </div>
            {cov && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-bold" data-testid="teks-coverage">{cov.done.length} of {cov.all.length} TEKS taught</p>
                <div className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${cov.all.length ? (cov.done.length / cov.all.length) * 100 : 0}%` }} /></div>
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">Not taught yet ({cov.todo.length})</summary>
                  <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                    {cov.todo.map((i) => <li key={i.id}><b>{i.code}</b> {i.ican}</li>)}
                  </ul>
                </details>
              </div>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">Nothing logged in this range yet. Use the 📖 button on a statement, or tick “Log in tracker” when adding TEKS.</p>
        ) : (
          <div className="space-y-3" data-testid="teks-tracker">
            {Object.entries(byDate).map(([d, list]) => (
              <section key={d}>
                <h3 className="mb-1 text-sm font-black">{new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</h3>
                <ul className="space-y-1">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 rounded-xl bg-black/5 px-2 py-1.5 text-sm dark:bg-white/10">
                      <span className="w-16 shrink-0 font-black">{t.code ?? "—"}</span>
                      <span className="min-w-0 flex-1">{t.text}{t.className ? <span className="text-ink-soft"> · {t.className}</span> : null}</span>
                      <IconButton size="sm" label={`Remove ${t.code ?? "entry"} from ${d}`} onClick={() => st().removeTaught(t.id)}><X size={14} /></IconButton>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <Button variant="primary" size="sm" onClick={download} disabled={rows.length === 0}><Download size={14} /> Export CSV</Button>
      </div>
    </Modal>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<ICanConfig>(id);
  return <span className="max-w-32 truncate text-xs font-bold">{c.items?.length ? `${c.items.length} objective${c.items.length === 1 ? "" : "s"}` : ""}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<ICanConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Heading">
        <input className={inputCls} value={c.heading} maxLength={40} onChange={(e) => set({ heading: e.target.value })} />
      </Field>
      <Field label="Text size">
        <Segmented label="Text size" value={c.fontSize} onChange={(fontSize) => set({ fontSize })} options={[{ value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra large" }]} />
      </Field>
      <Toggle checked={c.showCodes} onChange={(showCodes) => set({ showCodes })} label="Show TEKS codes under statements" />
    </div>
  );
}

const ICanWidget: WidgetModule = { Body, Mini, Settings };
export default ICanWidget;
