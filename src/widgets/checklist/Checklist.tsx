"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, RotateCcw, Undo2, X } from "lucide-react";
import { useActiveClass, useConfig, useSession } from "@/store/hooks";
import { dayKey } from "@/lib/time";
import { uid } from "@/lib/ids";
import { Button, Field, IconButton, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export interface ChecklistConfig {
  title: string;
  scope: "general" | "class";
  dailyReset: boolean;
  items: { id: string; text: string }[];
}

interface ChecklistSession {
  progress: Record<string, string[]>;
  day: string;
  last?: { key: string; prev: string[] } | null;
}

export const CHECKLIST_TEMPLATES: { title: string; items: string[] }[] = [
  { title: "Lesson tasks", items: ["Take attendance", "Share learning target", "Model", "Practice", "Exit ticket"] },
  { title: "Materials", items: ["Pencils", "Notebooks", "Handouts", "Chromebooks", "Manipulatives"] },
  { title: "Transition", items: ["Stop & look", "Materials away", "Push in chairs", "Line up quietly"] },
  { title: "Dismissal", items: ["Homework written down", "Desks clean", "Backpacks packed", "Notes home", "Chairs stacked"] },
];

function useChecklist(id: string) {
  const [config, setConfig] = useConfig<ChecklistConfig>(id);
  const [session, setSession] = useSession<ChecklistSession>(id);
  const cls = useActiveClass();
  const key = config.scope === "class" ? cls?.id ?? "none" : "general";
  const today = dayKey();
  const stale = config.dailyReset && session && session.day !== today;
  useEffect(() => {
    if (stale) setSession({ progress: {}, day: today, last: null });
  }, [stale, today, setSession]);
  const checked = stale ? [] : session?.progress?.[key] ?? [];
  const setChecked = (next: string[]) =>
    setSession((prev) => ({ progress: { ...(prev?.progress ?? {}), [key]: next }, day: today, last: { key, prev: checked } }));
  return { config, setConfig, session, setSession, checked, setChecked, key, today, cls };
}

function Body({ id, view }: WidgetProps) {
  const { config, setConfig, session, setSession, checked, setChecked, key, today } = useChecklist(id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const done = config.items.filter((i) => checked.includes(i.id)).length;
  const total = config.items.length;

  const move = (idx: number, dir: -1 | 1) => {
    const items = config.items.slice();
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    setConfig({ items });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <input className={cx(inputCls, "min-h-10 font-bold")} value={config.title} aria-label="Checklist title" onChange={(e) => setConfig({ title: e.target.value })} />
        ) : (
          <p className="min-w-0 flex-1 truncate font-extrabold">{config.title}</p>
        )}
        <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-xs font-bold" aria-label={`${done} of ${total} done`}>
          {done}/{total}
        </span>
      </div>
      {total > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <ul className="space-y-1">
        {config.items.map((item, idx) => {
          const isChecked = checked.includes(item.id);
          return (
            <li key={item.id} className="flex items-center gap-1">
              {editing ? (
                <>
                  <input
                    className={cx(inputCls, "min-h-10")}
                    value={item.text}
                    aria-label={`Item ${idx + 1}`}
                    onChange={(e) => setConfig({ items: config.items.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)) })}
                  />
                  <IconButton label={`Move ${item.text} up`} onClick={() => move(idx, -1)} disabled={idx === 0} className="h-9 w-9">
                    <ArrowUp size={16} />
                  </IconButton>
                  <IconButton label={`Move ${item.text} down`} onClick={() => move(idx, 1)} disabled={idx === total - 1} className="h-9 w-9">
                    <ArrowDown size={16} />
                  </IconButton>
                  <IconButton label={`Delete ${item.text}`} onClick={() => setConfig({ items: config.items.filter((x) => x.id !== item.id) })} className="h-9 w-9">
                    <X size={16} />
                  </IconButton>
                </>
              ) : (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => setChecked(isChecked ? checked.filter((x) => x !== item.id) : [...checked, item.id])}
                  className={cx(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition hover:bg-soft",
                    view === "expanded" && "min-h-14 text-xl",
                  )}
                >
                  <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2", isChecked ? "border-accent bg-accent text-on-accent" : "border-line")}>
                    {isChecked && <Check size={16} strokeWidth={3} />}
                  </span>
                  <span className={cx("font-semibold", isChecked && "text-ink-soft line-through")}>{item.text}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setConfig({ items: [...config.items, { id: uid("i"), text: draft.trim().slice(0, 80) }] });
            setDraft("");
          }}
        >
          <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an item…" aria-label="New checklist item" />
          <Button type="submit" variant="accent" disabled={!draft.trim()}>
            Add
          </Button>
        </form>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={editing ? "accent" : "outline"} onClick={() => setEditing(!editing)}>
          <Pencil size={14} /> {editing ? "Done editing" : "Edit list"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSession({ progress: { ...(session?.progress ?? {}), [key]: [] }, day: today, last: { key, prev: checked } })} disabled={checked.length === 0}>
          <RotateCcw size={14} /> Reset
        </Button>
        {session?.last && session.last.key === key && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSession({ ...session, progress: { ...session.progress, [key]: session.last!.prev }, last: null })}
          >
            <Undo2 size={14} /> Undo
          </Button>
        )}
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const { config, checked } = useChecklist(id);
  return (
    <span className="text-xs font-bold">
      {config.items.filter((i) => checked.includes(i.id)).length}/{config.items.length}
    </span>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<ChecklistConfig>(id);
  return (
    <div className="space-y-3">
      <Toggle checked={c.dailyReset} onChange={(dailyReset) => set({ dailyReset })} label="Reset every day" description="Checks clear automatically each new day." />
      <Field label="Checklist belongs to" hint="“Each class” keeps separate progress per class; items stay the same.">
        <Segmented label="Checklist scope" value={c.scope} onChange={(scope) => set({ scope })} options={[{ value: "general", label: "Everyone" }, { value: "class", label: "Each class" }]} />
      </Field>
      <Field label="Start from a template" hint="Replaces the items in this checklist. Save your own templates with Save Favorite.">
        <div className="flex flex-wrap gap-1.5">
          {CHECKLIST_TEMPLATES.map((t) => (
            <Button key={t.title} size="sm" variant="outline" onClick={() => set({ title: t.title, items: t.items.map((text) => ({ id: uid("i"), text })) })}>
              {t.title}
            </Button>
          ))}
        </div>
      </Field>
    </div>
  );
}

const ChecklistWidget: WidgetModule = { Body, Mini, Settings };
export default ChecklistWidget;
