"use client";
import { useRef, useState } from "react";
import { Dices, RotateCcw } from "lucide-react";
import { useConfig, useReducedMotion, useSession, useSignal } from "@/store/hooks";
import { DIE_FACE_TRANSFORMS, dieRotationFor } from "@/lib/geometry";
import { randomInt } from "@/lib/random";
import { WIDGET_COLORS, COLOR_KEYS, colorOf } from "@/lib/colors";
import { Button, Field, IconButton, Segmented, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface DiceConfig {
  count: number;
  dieColor: string;
}
interface DiceSession {
  values: number[];
  rot: { rx: number; ry: number }[];
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ index, rot, size, color, rolling, durationMs, onDone, value }: { index: number; rot: { rx: number; ry: number }; size: number; color: string; rolling: boolean; durationMs: number; onDone: () => void; value: number | null }) {
  const half = size / 2;
  const c = colorOf(color);
  return (
    <div className="relative" style={{ width: size, height: size, perspective: size * 6 }} data-testid={`die-${index}`}>
      <div
        className="preserve-3d absolute inset-0"
        data-testid={`die-cube-${index}`}
        data-result={value ?? ""}
        data-rolling={rolling}
        style={{
          transform: `rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)`,
          transition: rolling ? `transform ${durationMs}ms cubic-bezier(.15,.8,.25,1)` : "none",
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) onDone();
        }}
      >
        {Object.entries(DIE_FACE_TRANSFORMS).map(([face, t]) => (
          <div
            key={face}
            data-face={face}
            className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[6%] rounded-[18%] p-[14%] shadow-inner"
            style={{
              transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(${half}px)`,
              background: `linear-gradient(145deg, rgba(255,255,255,.3), rgba(255,255,255,0)), ${c.accent}`,
              border: "2px solid rgba(0,0,0,.22)",
            }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={cx("rounded-full", PIPS[Number(face)].includes(i) && "bg-white shadow")} style={{ pointerEvents: "none" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Body({ id, view }: WidgetProps) {
  const [config] = useConfig<DiceConfig>(id);
  const [session, setSession] = useSession<DiceSession>(id);
  const reduced = useReducedMotion();
  const [rolling, setRolling] = useState(false);
  const pending = useRef(0);
  const count = Math.max(1, Math.min(3, config.count || 1));
  const rots = Array.from({ length: count }, (_, i) => session?.rot?.[i] ?? { rx: -20, ry: 25 });
  const values = session?.values ?? [];
  const size = view === "expanded" ? 150 : count === 1 ? 80 : 60;
  const durationMs = reduced ? 250 : 1600;

  const roll = () => {
    if (rolling) return; // prevent overlapping rolls
    const newValues = Array.from({ length: count }, () => randomInt(6) + 1);
    const newRots = newValues.map((v, i) => dieRotationFor(v, rots[i], 2 + i));
    pending.current = count;
    setRolling(true);
    setSession({ values: newValues, rot: newRots });
  };
  useSignal(id, (s) => {
    if (s.name === "roll") roll();
  });

  const done = () => {
    pending.current -= 1;
    if (pending.current <= 0) setRolling(false);
  };

  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-1 text-center">
      {/* Dice and the Roll button sit side by side to keep the card compact. */}
      <div className={cx("flex items-center justify-center", view === "expanded" ? "flex-col gap-4 py-4" : "flex-wrap gap-x-4 gap-y-2 py-1")}>
        <div className="flex items-center justify-center gap-4 py-2">
          {rots.map((r, i) => (
            <Die key={i} index={i} rot={r} size={size} color={config.dieColor} rolling={rolling} durationMs={durationMs} onDone={done} value={values[i] ?? null} />
          ))}
        </div>
        <div className={cx("flex items-center gap-2", view === "expanded" ? "flex-row" : "flex-col")}>
          <Button variant="accent" size={view === "expanded" ? "lg" : "md"} onClick={roll} disabled={rolling} className="min-w-24">
            <Dices size={18} /> Roll
          </Button>
          <IconButton label="Reset dice" variant="outline" disabled={rolling} onClick={() => setSession(undefined)}>
            <RotateCcw size={18} />
          </IconButton>
        </div>
      </div>
      <p className="min-h-7 text-lg font-black" aria-live="polite" data-testid="dice-result">
        {!rolling && values.length > 0 ? (count > 1 ? `${values.join(" + ")} = ${total}` : `You rolled ${values[0]}`) : rolling ? "Rolling…" : "\u00a0"}
      </p>
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<DiceConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Number of dice">
        <Segmented label="Number of dice" value={c.count} onChange={(count) => set({ count })} options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} />
      </Field>
      <Field label="Dice color">
        <div className="flex flex-wrap gap-2">
          {COLOR_KEYS.map((k) => (
            <button key={k} type="button" aria-label={WIDGET_COLORS[k].label} aria-pressed={c.dieColor === k} onClick={() => set({ dieColor: k })} className={cx("h-9 w-9 rounded-full border-4", c.dieColor === k ? "border-ink" : "border-transparent")} style={{ background: WIDGET_COLORS[k].accent }} />
          ))}
        </div>
      </Field>
    </div>
  );
}

const DiceWidget: WidgetModule = { Body, Settings };
export default DiceWidget;
