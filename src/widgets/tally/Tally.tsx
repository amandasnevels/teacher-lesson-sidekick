"use client";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useConfig, useSession } from "@/store/hooks";
import { Button, Field, IconButton, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface TallyConfig {
  label: string;
  goal: number;
  step: number;
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<TallyConfig>(id);
  const [s, setS] = useSession<{ count: number }>(id);
  const count = s?.count ?? 0;
  const step = c.step || 1;
  const reached = c.goal > 0 && count >= c.goal;
  return (
    <div className="space-y-2 text-center">
      <input className="w-full bg-transparent text-center font-extrabold focus:outline-none" value={c.label} onChange={(e) => set({ label: e.target.value })} aria-label="Tally label" maxLength={40} />
      <p className={cx("big-digits font-black", view === "expanded" ? "text-9xl" : "text-6xl", reached && "text-[#2bb673]")} data-testid="tally-count" aria-live="polite">
        {count}
      </p>
      {c.goal > 0 && (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (count / c.goal) * 100)}%` }} />
          </div>
          <p className="text-sm font-bold text-ink-soft">{reached ? "🎉 Goal reached!" : `Goal: ${c.goal}`}</p>
        </>
      )}
      <div className="flex justify-center gap-2">
        <IconButton label="Decrease" variant="outline" size="xl" onClick={() => setS({ count: Math.max(0, count - step) })}>
          <Minus size={20} />
        </IconButton>
        <Button variant="accent" size="lg" onClick={() => setS({ count: count + step })} aria-label="Increase">
          <Plus size={22} /> {step}
        </Button>
        <IconButton label="Reset tally" variant="ghost" size="xl" onClick={() => setS({ count: 0 })}>
          <RotateCcw size={18} />
        </IconButton>
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [s] = useSession<{ count: number }>(id);
  return <span className="big-digits text-sm font-black">{s?.count ?? 0}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<TallyConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Goal (0 = none)">
        <input type="number" min={0} className={inputCls} value={c.goal} onChange={(e) => set({ goal: Math.max(0, Number(e.target.value) || 0) })} />
      </Field>
      <Field label="Count by">
        <input type="number" min={1} max={100} className={inputCls} value={c.step} onChange={(e) => set({ step: Math.max(1, Number(e.target.value) || 1) })} />
      </Field>
    </div>
  );
}

const TallyWidget: WidgetModule = { Body, Mini, Settings };
export default TallyWidget;
