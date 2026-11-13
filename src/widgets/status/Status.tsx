"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useConfig } from "@/store/hooks";
import { Button, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface StatusConfig {
  statuses: string[];
  current: string;
}
const EMOJI: Record<string, string> = { Teaching: "🧑‍🏫", "Independent Work": "✍️", "Partner Work": "👯", Testing: "📝", Transition: "🔁", Break: "☕" };

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<StatusConfig>(id);
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-accent px-3 py-3 text-center text-on-accent" aria-live="polite" data-testid="class-status">
        <p className={cx("font-black", view === "expanded" ? "text-6xl" : "text-2xl")}>
          {EMOJI[c.current] ?? "📌"} {c.current}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Class status">
        {c.statuses.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={c.current === s} onClick={() => set({ current: s })} className={cx("min-h-9 rounded-full px-3 text-sm font-bold", c.current === s ? "bg-accent text-on-accent" : "bg-soft")}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<StatusConfig>(id);
  return <span className="max-w-28 truncate text-xs font-bold">{c.current}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<StatusConfig>(id);
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {c.statuses.map((s) => (
          <li key={s} className="flex items-center justify-between rounded-xl bg-soft px-3 py-1.5 font-semibold">
            {s}
            <button type="button" aria-label={`Remove ${s}`} className="p-1" disabled={c.statuses.length <= 1} onClick={() => set({ statuses: c.statuses.filter((x) => x !== s), current: c.current === s ? c.statuses.find((x) => x !== s)! : c.current })}>
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (v && !c.statuses.includes(v)) set({ statuses: [...c.statuses, v.slice(0, 30)] }); setDraft(""); }}>
        <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Custom status" aria-label="Custom status" />
        <Button type="submit" variant="accent">Add</Button>
      </form>
    </div>
  );
}

const StatusWidget: WidgetModule = { Body, Mini, Settings };
export default StatusWidget;
