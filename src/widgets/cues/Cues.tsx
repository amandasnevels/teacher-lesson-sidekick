"use client";
import { useConfig } from "@/store/hooks";
import { cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface Cue {
  id: string;
  icon: string;
  label: string;
}
interface CuesConfig {
  cues: Cue[];
  active: string | null;
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<CuesConfig>(id);
  const active = c.cues.find((x) => x.id === c.active);
  return (
    <div className="space-y-2">
      {active && (
        <div className="pop-in rounded-2xl bg-accent px-3 py-4 text-center text-on-accent" aria-live="polite" data-testid="active-cue">
          <p className={view === "expanded" ? "text-[9rem] leading-none" : "text-6xl"} aria-hidden>{active.icon}</p>
          <p className={cx("font-black", view === "expanded" ? "text-6xl" : "text-2xl")}>{active.label}</p>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5" role="radiogroup" aria-label="Visual cue">
        {c.cues.map((cue) => (
          <button key={cue.id} type="button" role="radio" aria-checked={c.active === cue.id} onClick={() => set({ active: c.active === cue.id ? null : cue.id })} className={cx("flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-xs font-bold", c.active === cue.id ? "bg-accent text-on-accent" : "bg-soft")}>
            <span className="text-2xl" aria-hidden>{cue.icon}</span>
            <span className="w-full truncate text-center">{cue.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<CuesConfig>(id);
  return (
    <ul className="space-y-1.5">
      {c.cues.map((cue) => (
        <li key={cue.id} className="flex gap-1.5">
          <input className={cx(inputCls, "w-16 text-center text-xl")} value={cue.icon} maxLength={4} aria-label={`Icon for ${cue.label}`} onChange={(e) => set({ cues: c.cues.map((x) => (x.id === cue.id ? { ...x, icon: e.target.value } : x)) })} />
          <input className={inputCls} value={cue.label} maxLength={30} aria-label={`Label for ${cue.id}`} onChange={(e) => set({ cues: c.cues.map((x) => (x.id === cue.id ? { ...x, label: e.target.value } : x)) })} />
        </li>
      ))}
    </ul>
  );
}

const CuesWidget: WidgetModule = { Body, Settings };
export default CuesWidget;
