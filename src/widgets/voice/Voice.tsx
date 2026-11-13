"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useConfig } from "@/store/hooks";
import type { VoiceLevel } from "@/lib/types";
import { MicMeter, type MicError, type MicState } from "@/lib/micMeter";
import { Button, Field, Toggle, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export const VOICE_LEVELS: Record<VoiceLevel, { label: string; emoji: string; desc: string; yellow: number; red: number; color: string }> = {
  silent: { label: "Silent", emoji: "🤫", desc: "No voices", yellow: 18, red: 32, color: "#5b6779" },
  whisper: { label: "Whisper", emoji: "🐭", desc: "Only your neighbor can hear", yellow: 32, red: 50, color: "#12a594" },
  partner: { label: "Partner", emoji: "👯", desc: "Talk with one partner", yellow: 45, red: 62, color: "#0c8ce9" },
  table: { label: "Table", emoji: "🪑", desc: "Your table group can hear", yellow: 55, red: 72, color: "#8e4ec6" },
  presentation: { label: "Presentation", emoji: "🎤", desc: "The whole room can hear", yellow: 70, red: 86, color: "#f76b15" },
};

interface VoiceConfig {
  level: VoiceLevel;
  sensitivity: number;
  customThresholds: boolean;
  yellow: number;
  red: number;
}

export function thresholdsFor(c: VoiceConfig) {
  const base = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  return c.customThresholds ? { yellow: c.yellow, red: c.red } : { yellow: base.yellow, red: base.red };
}

export function zoneFor(level: number, t: { yellow: number; red: number }): "green" | "yellow" | "red" {
  return level >= t.red ? "red" : level >= t.yellow ? "yellow" : "green";
}

/**
 * One meter per widget instance. A short grace period lets the card move into the expanded view
 * without re-prompting; otherwise the microphone is released as soon as the widget unmounts.
 */
const meters = new Map<string, { meter: MicMeter; refs: number; timer?: ReturnType<typeof setTimeout> }>();
function acquire(id: string): MicMeter {
  let e = meters.get(id);
  if (!e) {
    e = { meter: new MicMeter(), refs: 0 };
    meters.set(id, e);
  }
  if (e.timer) clearTimeout(e.timer);
  e.refs += 1;
  return e.meter;
}
function release(id: string) {
  const e = meters.get(id);
  if (!e) return;
  e.refs -= 1;
  if (e.refs <= 0) {
    e.timer = setTimeout(() => {
      if (e.refs <= 0) {
        e.meter.stop();
        meters.delete(id);
      }
    }, 300);
  }
}

const ZONE_COLORS = { green: "#2bb673", yellow: "#f5b700", red: "#e5484d" };

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<VoiceConfig>(id);
  const meterRef = useRef<MicMeter | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MicState>("off");
  const [error, setError] = useState<MicError | null>(null);
  const [zone, setZone] = useState<"green" | "yellow" | "red">("green");
  const t = thresholdsFor(c);
  const tRef = useRef(t);
  tRef.current = t;
  const lv = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  const big = view === "expanded";

  useEffect(() => {
    const m = acquire(id);
    meterRef.current = m;
    setState(m.state);
    let lastZoneUpdate = 0;
    m.onState = (s, err) => {
      setState(s);
      setError(err ?? null);
    };
    m.onLevel = (level) => {
      const el = barRef.current;
      if (el) {
        const z = zoneFor(level, tRef.current);
        el.style.width = `${level}%`;
        el.style.background = ZONE_COLORS[z];
        el.parentElement?.setAttribute("aria-valuenow", String(Math.round(level)));
        const now = performance.now();
        if (now - lastZoneUpdate > 250) {
          lastZoneUpdate = now;
          setZone(z);
        }
      }
    };
    return () => {
      m.onLevel = () => {};
      m.onState = () => {};
      release(id);
    };
  }, [id]);

  useEffect(() => {
    if (meterRef.current) meterRef.current.sensitivity = c.sensitivity;
  }, [c.sensitivity]);

  const on = state === "on";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Voice level expectation">
        {(Object.keys(VOICE_LEVELS) as VoiceLevel[]).map((k, i) => {
          const v = VOICE_LEVELS[k];
          const active = c.level === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${i} ${v.label}`}
              onClick={() => set({ level: k })}
              className={cx("flex min-h-14 flex-col items-center justify-center rounded-xl px-0.5 text-[11px] font-bold leading-tight transition", active ? "scale-105 text-white shadow-md" : "bg-soft text-ink")}
              style={active ? { background: v.color } : undefined}
            >
              <span className="text-xl" aria-hidden>{v.emoji}</span>
              <span className="w-full truncate @max-[290px]:sr-only">{v.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl px-3 py-2 text-center text-white" style={{ background: lv.color }} data-testid="voice-expectation">
        <p className={cx("font-black", big ? "text-6xl" : "text-2xl")}>
          {lv.emoji} {lv.label}
        </p>
        <p className={cx("font-semibold opacity-95", big ? "text-2xl" : "text-sm")}>{lv.desc}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {on ? (
            <Button variant="danger" size="sm" onClick={() => meterRef.current?.stop()}>
              <MicOff size={16} /> Stop microphone
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => meterRef.current?.start()} disabled={state === "starting"}>
              <Mic size={16} /> {state === "starting" ? "Waiting for permission…" : "Enable microphone"}
            </Button>
          )}
          {on && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#d93036]" role="status">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#e5484d]" /> Mic on · not recorded
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-[#ffe5e6] px-3 py-2 text-sm font-semibold text-[#8a1c20]" data-testid="mic-error">
            {error.message}
          </p>
        )}
        <div
          className="relative h-8 overflow-hidden rounded-full bg-line"
          role="meter"
          aria-label="Classroom noise level (relative)"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={on ? `${zone === "green" ? "Good" : zone === "yellow" ? "Getting loud" : "Too loud"} for ${lv.label}` : "Microphone off"}
        >
          <div className="absolute inset-y-0 left-0 bg-[#2bb673]/25" style={{ width: `${t.yellow}%` }} />
          <div className="absolute inset-y-0 bg-[#f5b700]/25" style={{ left: `${t.yellow}%`, width: `${t.red - t.yellow}%` }} />
          <div className="absolute inset-y-0 right-0 bg-[#e5484d]/25" style={{ left: `${t.red}%` }} />
          <div ref={barRef} className="absolute inset-y-1 left-1 rounded-full transition-[width] duration-75" style={{ width: "0%", background: ZONE_COLORS.green }} data-testid="noise-bar" />
          <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${t.yellow}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${t.red}%` }} />
        </div>
        {on && (
          <p className={cx("text-center font-black", big ? "text-4xl" : "text-lg")} style={{ color: ZONE_COLORS[zone] === "#f5b700" ? "#a47800" : ZONE_COLORS[zone] }} aria-live="polite">
            {zone === "green" ? "👍 Just right" : zone === "yellow" ? "⚠️ Getting loud" : "🛑 Too loud"}
          </p>
        )}
        <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
          Sensitivity
          <input type="range" min={0.5} max={4} step={0.1} value={c.sensitivity} onChange={(e) => set({ sensitivity: Number(e.target.value) })} className="min-w-0 flex-1 accent-[var(--accent)]" aria-label="Microphone sensitivity" />
        </label>
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<VoiceConfig>(id);
  const v = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: v.color }}>
      {v.emoji} {v.label}
    </span>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<VoiceConfig>(id);
  const t = thresholdsFor(c);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">The meter shows relative loudness (not calibrated decibels). Audio is analysed on this device and never recorded or sent anywhere.</p>
      <Toggle checked={c.customThresholds} onChange={(customThresholds) => set({ customThresholds, yellow: t.yellow, red: t.red })} label="Custom thresholds" description="Otherwise thresholds follow the selected voice level." />
      {c.customThresholds && (
        <>
          <Field label={`Yellow starts at ${c.yellow}`}>
            <input type="range" min={5} max={95} value={c.yellow} onChange={(e) => set({ yellow: Math.min(Number(e.target.value), c.red - 5) })} className="w-full" />
          </Field>
          <Field label={`Red starts at ${c.red}`}>
            <input type="range" min={10} max={100} value={c.red} onChange={(e) => set({ red: Math.max(Number(e.target.value), c.yellow + 5) })} className="w-full" />
          </Field>
        </>
      )}
    </div>
  );
}

const VoiceWidget: WidgetModule = { Body, Mini, Settings };
export default VoiceWidget;
