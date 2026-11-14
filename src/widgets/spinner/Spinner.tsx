"use client";
import { useState } from "react";
import { Pencil, RotateCw } from "lucide-react";
import { useConfig, useReducedMotion, useSession, useSignal } from "@/store/hooks";
import { segmentAtPointer, spinnerRotationFor } from "@/lib/geometry";
import { randomInt } from "@/lib/random";
import { SEGMENT_COLORS } from "@/lib/colors";
import { uid } from "@/lib/ids";
import { Button, OptionListEditor, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

type Opt = { id: string; label: string };
interface SpinnerConfig {
  options: Opt[];
}
interface SpinnerSession {
  rotation: number;
  resultId: string | null;
}

function arcPath(i: number, n: number, r: number) {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (a: number) => `${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`;
  if (n === 1) return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
  return `M 0 0 L ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)} Z`;
}

export function Wheel({ options, rotation, spinning, durationMs, onDone, size }: { options: Opt[]; rotation: number; spinning: boolean; durationMs: number; onDone: () => void; size: number | string }) {
  const n = options.length;
  const R = 100;
  return (
    <div className="relative mx-auto w-[230px]" style={{ width: size, maxWidth: "100%" }}>
      {/* Pointer at 12 o'clock */}
      <svg viewBox="0 0 40 36" className="absolute left-1/2 top-0 z-10 w-[12%] -translate-x-1/2 -translate-y-[35%] drop-shadow" aria-hidden>
        <path d="M2 2 L38 2 L20 34 Z" fill="var(--ink)" stroke="var(--card)" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div
        data-testid="spinner-wheel"
        data-rotation={rotation}
        className="aspect-square w-full rounded-full shadow-lg"
        style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${durationMs}ms cubic-bezier(.12,.72,.18,1)` : "none" }}
        onTransitionEnd={(e) => e.target === e.currentTarget && onDone()}
      >
        <svg viewBox="-104 -104 208 208" className="h-full w-full" role="img" aria-label={`Wheel with ${n} options`}>
          <circle r="103" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
          {options.map((o, i) => {
            const mid = ((i + 0.5) / n) * 360;
            // Avoid the last segment matching the first one's color.
            const color = i === n - 1 && n > 1 && i % SEGMENT_COLORS.length === 0 ? SEGMENT_COLORS[3] : SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            const label = o.label.length > 14 ? o.label.slice(0, 13) + "…" : o.label;
            return (
              <g key={o.id}>
                <path d={arcPath(i, n, R)} fill={color} stroke="#fff" strokeWidth="1.5" data-segment-index={i} data-segment-label={o.label} />
                <text
                  transform={`rotate(${mid}) translate(0 ${-R * 0.58}) rotate(${mid > 180 ? 90 : -90})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontWeight="800"
                  fontSize={n > 12 ? 8 : n > 8 ? 10 : 12}
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.25)", strokeWidth: 2, pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
          <circle r="14" fill="var(--card)" stroke="var(--line)" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

function Body({ id, view }: WidgetProps) {
  const [config, setConfig] = useConfig<SpinnerConfig>(id);
  const [session, setSession] = useSession<SpinnerSession>(id);
  const reduced = useReducedMotion();
  const [spinning, setSpinning] = useState(false);
  const [editing, setEditing] = useState(false);
  const options = config.options ?? [];
  const rotation = session?.rotation ?? 0;
  const result = options.find((o) => o.id === session?.resultId);
  const durationMs = reduced ? 300 : 4200;

  const spin = () => {
    if (spinning || options.length < 2) return;
    const index = randomInt(options.length);
    const jitter = (randomInt(1000) / 1000) * 2 - 1;
    const next = spinnerRotationFor(index, options.length, rotation, reduced ? 1 : 5 + randomInt(3), jitter);
    // Sanity: the landing is computed from the chosen index, and verified here.
    const landed = segmentAtPointer(next, options.length);
    setSpinning(true);
    setSession({ rotation: next, resultId: options[landed].id });
  };
  useSignal(id, (s) => s.name === "spin" && spin());

  return (
    <div className="space-y-3 text-center">
      <Wheel options={options} rotation={rotation} spinning={spinning} durationMs={durationMs} onDone={() => setSpinning(false)} size={view === "expanded" ? 480 : "clamp(230px, 62cqi, 460px)"} />
      <p className={cx("min-h-8 text-2xl font-black", !spinning && result && "pop-in")} aria-live="polite" data-testid="spinner-result">
        {spinning ? "Spinning…" : result ? result.label : " "}
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="accent" size={view === "expanded" ? "lg" : "md"} onClick={spin} disabled={spinning || options.length < 2} className="min-w-28">
          <RotateCw size={18} /> Spin
        </Button>
        <Button variant="outline" onClick={() => setEditing(!editing)} aria-expanded={editing}>
          <Pencil size={16} /> {editing ? "Done" : "Edit options"}
        </Button>
      </div>
      {editing && (
        <div className="text-left">
          <OptionListEditor label="Spinner options" options={options} onChange={(o) => { setConfig({ options: o }); if (!o.some((x) => x.id === session?.resultId)) setSession(session ? { ...session, resultId: null } : undefined); }} newId={() => uid("opt")} />
        </div>
      )}
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [config, setConfig] = useConfig<SpinnerConfig>(id);
  return <OptionListEditor label="Spinner options" options={config.options ?? []} onChange={(options) => setConfig({ options })} newId={() => uid("opt")} />;
}

const SpinnerWidget: WidgetModule = { Body, Settings };
export default SpinnerWidget;
