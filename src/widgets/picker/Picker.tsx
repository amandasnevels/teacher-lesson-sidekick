"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { scopeKey, useSidekick } from "@/store/store";
import { useActiveClass, useConfig, useReducedMotion, useSignal } from "@/store/hooks";
import { randomInt } from "@/lib/random";
import { Button, Toggle, cx } from "@/components/ui";
import { RosterGate } from "../RosterGate";
import type { WidgetModule, WidgetProps } from "../types";
import { MasteryPicker } from "./Mastery";

interface PickerConfig {
  markParticipation: boolean;
  /** Correct / incorrect mastery check mode. */
  mastery?: boolean;
}

/** Choose the next student: never repeats within a round. Returns null when everyone was drawn. */
export function drawNext(studentIds: string[], drawn: string[], rand = randomInt): string | null {
  const remaining = studentIds.filter((id) => !drawn.includes(id));
  if (remaining.length === 0) return null;
  return remaining[rand(remaining.length)];
}

function Body({ id, view }: WidgetProps) {
  const [config, set] = useConfig<PickerConfig>(id);
  return (
    <RosterGate>
      <div className="space-y-2">
        <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-xl bg-soft/60 px-2 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={!!config.mastery} onChange={(e) => set({ mastery: e.target.checked })} />
          ✓ ✗ Correct / incorrect (mastery check)
        </label>
        {config.mastery ? <MasteryBody big={view === "expanded"} /> : <PickerInner id={id} big={view === "expanded"} />}
      </div>
    </RosterGate>
  );
}

function MasteryBody({ big }: { big: boolean }) {
  const cls = useActiveClass()!;
  return <MasteryPicker cls={cls} big={big} />;
}

function PickerInner({ id, big }: { id: string; big: boolean }) {
  const cls = useActiveClass()!;
  const key = scopeKey(cls.id, id);
  const drawnRaw = useSidekick((s) => s.records.picker[key]);
  const [config] = useConfig<PickerConfig>(id);
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const ids = cls.students.map((s) => s.id);
  const drawn = (drawnRaw ?? []).filter((d) => ids.includes(d));
  const remaining = ids.length - drawn.length;
  const nameOf = (sid: string | null) => cls.students.find((s) => s.id === sid)?.name ?? "";

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    setLastPicked(null);
    setDisplay(null);
  }, [cls.id]);

  const pick = () => {
    if (busy) return;
    const choice = drawNext(ids, drawn);
    if (!choice) return;
    const st = useSidekick.getState();
    // Commit immediately so a double-tap can never select the same student twice.
    st.setPickerDrawn(key, [...drawn, choice]);
    if (config.markParticipation) {
      const part = st.records.participation[cls.id];
      if (!part?.checked.includes(choice)) st.toggleParticipation(cls.id, choice);
    }
    if (reduced) {
      setDisplay(choice);
      setLastPicked(choice);
      return;
    }
    setBusy(true);
    const steps = 14;
    let delay = 40;
    let t = 0;
    for (let i = 0; i < steps; i++) {
      t += delay;
      delay *= 1.17;
      const isLast = i === steps - 1;
      timers.current.push(
        setTimeout(() => {
          if (isLast) {
            setDisplay(choice);
            setLastPicked(choice);
            setBusy(false);
          } else setDisplay(ids[randomInt(ids.length)]);
        }, t),
      );
    }
  };

  useSignal(id, (sig) => {
    if (sig.name === "pick") pick();
  });

  return (
    <div className="space-y-3 text-center">
      <div
        className={cx("flex min-h-24 items-center justify-center rounded-2xl bg-soft px-3 transition", !busy && lastPicked && "pop-in")}
        aria-live="polite"
        aria-atomic="true"
      >
        {display ? (
          <p className={cx("font-black leading-tight", busy ? "opacity-60" : "", big ? "text-6xl" : "text-3xl")} data-testid="picked-name" data-final={!busy}>
            {nameOf(display)}
          </p>
        ) : remaining === 0 ? null : (
          <p className="font-semibold text-ink-soft">Tap Pick to choose a student</p>
        )}
      </div>
      {remaining === 0 && !busy && (
        <p className="rounded-xl bg-[#fff5cc] px-3 py-2 text-sm font-bold text-[#5c4300]" role="status">
          🎉 Everyone has been picked this round! Reset to start again.
        </p>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="accent" size={big ? "lg" : "md"} onClick={pick} disabled={busy || remaining === 0} className="min-w-28">
          <Shuffle size={18} /> Pick
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            useSidekick.getState().setPickerDrawn(key, []);
            setDisplay(null);
            setLastPicked(null);
          }}
          disabled={busy || drawn.length === 0}
        >
          <RotateCcw size={16} /> Reset round
        </Button>
      </div>
      <p className="text-sm font-semibold text-ink-soft" data-testid="picker-progress">
        {drawn.length} of {ids.length} picked · {remaining} left
      </p>
      {drawn.length > 0 && (
        <details className="text-left text-sm">
          <summary className="cursor-pointer font-semibold text-ink-soft">Picked this round</summary>
          <p className="mt-1">{drawn.map(nameOf).join(", ")}</p>
        </details>
      )}
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<PickerConfig>(id);
  return (
    <div className="space-y-3">
    <Toggle
      checked={!!c.mastery}
      onChange={(mastery) => set({ mastery })}
      label="Correct / incorrect mastery check"
      description="Check an I Can objective: correct answers earn a point; incorrect ones are quietly marked for reteach in the Mastery tracker."
    />
    <Toggle
      checked={!!c.markParticipation}
      onChange={(markParticipation) => set({ markParticipation })}
      label="Mark participation when picked"
      description="Also checks the student off in the Participation tracker."
    />
    </div>
  );
}

const PickerWidget: WidgetModule = { Body, Settings };
export default PickerWidget;
