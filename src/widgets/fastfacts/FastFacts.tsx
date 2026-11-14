"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useConfig, useSession } from "@/store/hooks";
import { FACT_LEVELS, OP_LABELS, nextFact, type FactOp, type MathFact } from "@/lib/learning/mathFacts";
import { Button, Field, Segmented, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export interface FastFactsConfig {
  op: FactOp;
  level: string;
  focus: number;
  pace: number; // seconds before the answer shows in auto mode (0 = manual only)
  setSize: number; // 0 = unlimited
}
interface FastFactsSession {
  fact: MathFact | null;
  revealed: boolean;
  count: number;
}

const OPS: { value: FactOp; label: string }[] = [
  { value: "add", label: "+" },
  { value: "sub", label: "−" },
  { value: "mul", label: "×" },
  { value: "div", label: "÷" },
  { value: "mixed", label: "Mix" },
];

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<FastFactsConfig>(id);
  const [raw, setS] = useSession<FastFactsSession>(id);
  const s: FastFactsSession = raw ?? { fact: null, revealed: false, count: 0 };
  const [playing, setPlaying] = useState(false);
  const levels = FACT_LEVELS[c.op] ?? FACT_LEVELS.add;
  const level = levels.some((l) => l.value === c.level) ? c.level : levels[0].value;
  const big = view === "expanded";
  const setDone = c.setSize > 0 && s.count >= c.setSize && s.revealed;
  const sRef = useRef(s);
  sRef.current = s;

  const next = () => {
    const cur = sRef.current;
    if (c.setSize > 0 && cur.count >= c.setSize) return;
    setS({ fact: nextFact(c.op, level, c.focus, cur.fact?.key ?? null), revealed: false, count: cur.count + 1 });
  };
  const restart = () => {
    setPlaying(false);
    setS({ fact: null, revealed: false, count: 0 });
  };

  // Auto mode: show the fact for `pace` seconds, reveal, pause briefly, then the next fact.
  useEffect(() => {
    if (!playing || c.pace <= 0) return;
    if (!s.fact) {
      next();
      return;
    }
    if (setDone) {
      setPlaying(false);
      return;
    }
    const t = s.revealed ? setTimeout(next, 1500) : setTimeout(() => setS({ ...sRef.current, revealed: true }), c.pace * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, s.fact?.key, s.count, s.revealed, c.pace, setDone]);

  // Changing the topic or level starts a fresh set.
  const topicKey = `${c.op}|${level}|${c.focus}|${c.setSize}`;
  const lastTopic = useRef(topicKey);
  useEffect(() => {
    if (lastTopic.current === topicKey) return; // same topic (incl. first load): keep the saved set
    lastTopic.current = topicKey;
    setPlaying(false);
    setS({ fact: null, revealed: false, count: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey]);

  return (
    <div className="space-y-3">
      <Segmented label="Math fact topic" value={c.op} onChange={(op) => set({ op, level: FACT_LEVELS[op][0].value })} options={OPS.map((o) => ({ value: o.value, label: <span aria-label={OP_LABELS[o.value]}>{o.label}</span> }))} />
      <div className="flex gap-1.5">
        <select className={cx(inputCls, "min-h-10")} value={level} onChange={(e) => set({ level: e.target.value })} aria-label="Fact level">
          {levels.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        {level === "focus" && (
          <select className={cx(inputCls, "min-h-10 w-24")} value={c.focus} onChange={(e) => set({ focus: Number(e.target.value) })} aria-label="Focus number">
            {Array.from({ length: c.op === "div" ? 12 : 13 }, (_, i) => (c.op === "div" ? i + 1 : i)).map((n) => (
              <option key={n} value={n}>{c.op === "div" ? `÷ ${n}` : `× ${n}`}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-soft px-3 py-4 text-center" aria-live="polite">
        {s.fact ? (
          <p className="big-digits text-5xl font-black leading-none" style={{ fontSize: big ? "min(16vw, 8rem)" : "clamp(2.4rem, 15cqi, 4.5rem)" }} data-testid="fact-prompt">
            {s.fact.prompt.includes("☐") ? s.fact.prompt.replace("☐", s.revealed ? String(s.fact.answer) : "☐") : `${s.fact.prompt} = ${s.revealed ? s.fact.answer : "?"}`}
          </p>
        ) : (
          <p className="font-semibold text-ink-soft">{OP_LABELS[c.op]} · {levels.find((l) => l.value === level)?.label}. Tap Start.</p>
        )}
        {s.count > 0 && (
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-soft" data-testid="fact-count">
            {c.setSize > 0 ? `${s.count} of ${c.setSize}` : `Fact ${s.count}`}
          </p>
        )}
        {setDone && <p className="pop-in mt-1 font-black">🎉 Set complete!</p>}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {c.pace > 0 && !setDone && (
          <Button variant={playing ? "outline" : "accent"} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause auto play" : "Start auto play"}>
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pause" : "Auto"}
          </Button>
        )}
        {s.fact && !s.revealed && (
          <Button variant="outline" onClick={() => setS({ ...s, revealed: true })}><Eye size={16} /> Show answer</Button>
        )}
        {!setDone && (
          <Button variant={c.pace > 0 ? "outline" : "accent"} onClick={next}><SkipForward size={16} /> {s.fact ? "Next" : "Start"}</Button>
        )}
        {s.count > 0 && (
          <Button variant="ghost" onClick={restart}><RotateCcw size={16} /> Restart</Button>
        )}
      </div>
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<FastFactsConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Auto play: seconds before the answer shows" hint="Off = tap Next and Show answer yourself.">
        <Segmented label="Auto pace" value={c.pace} onChange={(pace) => set({ pace })} options={[{ value: 0, label: "Off" }, { value: 3, label: "3 s" }, { value: 5, label: "5 s" }, { value: 8, label: "8 s" }, { value: 10, label: "10 s" }]} />
      </Field>
      <Field label="Facts per set">
        <Segmented label="Facts per set" value={c.setSize} onChange={(setSize) => set({ setSize })} options={[{ value: 10, label: "10" }, { value: 20, label: "20" }, { value: 0, label: "Unlimited" }]} />
      </Field>
    </div>
  );
}

const FastFactsWidget: WidgetModule = { Body, Settings };
export default FastFactsWidget;
