"use client";
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, RotateCcw, SkipForward, X } from "lucide-react";
import { useConfig, useNow, useSession } from "@/store/hooks";
import { uid } from "@/lib/ids";
import { GRADE_BANDS, SUBJECTS, drawQuestion, type GradeBand, type QuizQuestion, type QuizSubject } from "@/lib/learning/quizBank";
import { Button, Field, IconButton, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface CustomQ {
  id: string;
  q: string;
  a: string;
}
export interface QuizConfig {
  grade: GradeBand;
  subject: QuizSubject;
  thinkSeconds: number;
  teams: boolean;
  teamNames: [string, string];
  custom: CustomQ[];
}
interface QuizSession {
  setKey: string;
  current: QuizQuestion | null;
  revealed: boolean;
  used: string[];
  count: number;
  done: boolean;
  scores: [number, number];
  thinkEnd: number | null;
}

const setKeyOf = (c: QuizConfig) => `${c.grade}|${c.subject}`;
const fresh = (c: QuizConfig, scores: [number, number] = [0, 0]): QuizSession => ({ setKey: setKeyOf(c), current: null, revealed: false, used: [], count: 0, done: false, scores, thinkEnd: null });

function CustomEditor({ id }: { id: string }) {
  const [c, set] = useConfig<QuizConfig>(id);
  const list = c.custom ?? [];
  const upd = (qid: string, patch: Partial<CustomQ>) => set({ custom: list.map((x) => (x.id === qid ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-sm text-ink-soft">Add your own questions and answers. They stay on this device.</p>}
      <ol className="space-y-2">
        {list.map((x, i) => (
          <li key={x.id} className="space-y-1 rounded-xl border-2 border-line p-2">
            <div className="flex gap-1">
              <input className={cx(inputCls, "min-h-10")} value={x.q} maxLength={200} placeholder={`Question ${i + 1}`} aria-label={`Question ${i + 1}`} onChange={(e) => upd(x.id, { q: e.target.value })} />
              <IconButton label={`Delete question ${i + 1}`} onClick={() => set({ custom: list.filter((y) => y.id !== x.id) })}>
                <X size={16} />
              </IconButton>
            </div>
            <input className={cx(inputCls, "min-h-10")} value={x.a} maxLength={120} placeholder="Answer" aria-label={`Answer ${i + 1}`} onChange={(e) => upd(x.id, { a: e.target.value })} />
          </li>
        ))}
      </ol>
      <Button size="sm" variant="outline" onClick={() => set({ custom: [...list, { id: uid("cq"), q: "", a: "" }] })}>
        <Plus size={14} /> Add question
      </Button>
    </div>
  );
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<QuizConfig>(id);
  const [raw, setS] = useSession<QuizSession>(id);
  const [editing, setEditing] = useState(false);
  const s = raw && raw.setKey === setKeyOf(c) ? raw : fresh(c, raw?.scores);
  const big = view === "expanded";
  const thinking = !!s.thinkEnd && !s.revealed && Date.now() < s.thinkEnd;
  useNow(200, thinking);
  const thinkLeft = s.thinkEnd ? Math.max(0, s.thinkEnd - Date.now()) : 0;

  // Think time is up → reveal automatically.
  useEffect(() => {
    if (!s.thinkEnd || s.revealed || !s.current) return;
    const ms = s.thinkEnd - Date.now();
    const t = setTimeout(() => setS((p) => (p && p.current && !p.revealed ? { ...p, revealed: true } : p)), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [s.thinkEnd, s.revealed, s.current, setS]);

  const next = () => {
    const d = drawQuestion(c.grade, c.subject, s.used, c.custom);
    if (!d.question) {
      setS({ ...s, current: null, done: true, revealed: false, thinkEnd: null });
      return;
    }
    setS({ ...s, current: d.question, used: d.used, count: s.count + 1, revealed: false, done: false, thinkEnd: c.thinkSeconds > 0 ? Date.now() + c.thinkSeconds * 1000 : null });
  };
  const reveal = () => setS({ ...s, revealed: true });
  const score = (i: 0 | 1, d: number) => setS({ ...s, scores: (i === 0 ? [Math.max(0, s.scores[0] + d), s.scores[1]] : [s.scores[0], Math.max(0, s.scores[1] + d)]) as [number, number] });
  const customCount = (c.custom ?? []).filter((x) => x.q.trim()).length;

  return (
    <div className="space-y-3">
      <Segmented label="Grade level" value={c.grade} onChange={(grade) => set({ grade })} options={GRADE_BANDS.map((g) => ({ value: g.value, label: g.label }))} />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Subject">
        {SUBJECTS.map((x) => (
          <button key={x.value} type="button" role="radio" aria-checked={c.subject === x.value} onClick={() => set({ subject: x.value })} className={cx("min-h-9 rounded-full px-3 text-xs font-bold", c.subject === x.value ? "bg-accent text-on-accent" : "bg-soft")}>
            {x.emoji} {x.label}
          </button>
        ))}
      </div>

      {c.subject === "custom" && (editing || customCount === 0) ? (
        <div className="space-y-2">
          <CustomEditor id={id} />
          {customCount > 0 && <Button size="sm" variant="accent" onClick={() => setEditing(false)}>Done</Button>}
        </div>
      ) : (
        <>
          <div className="relative flex min-h-36 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-soft px-4 py-5 text-center" aria-live="polite">
            {s.current ? (
              <>
                <span className="text-xs font-black uppercase tracking-wide text-ink-soft">Question {s.count}</span>
                <p className={cx("font-black leading-snug", big ? "text-5xl" : "text-xl")} data-testid="quiz-question">{s.current.q}</p>
                {s.revealed ? (
                  <p className={cx("pop-in rounded-xl bg-accent px-3 py-1 font-black text-on-accent", big ? "text-4xl" : "text-lg")} data-testid="quiz-answer">{s.current.a}</p>
                ) : thinking ? (
                  <p className="text-sm font-bold text-ink-soft">Think time… {Math.ceil(thinkLeft / 1000)}</p>
                ) : null}
                {thinking && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-line" aria-hidden>
                    <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${(thinkLeft / (c.thinkSeconds * 1000)) * 100}%` }} />
                  </div>
                )}
              </>
            ) : s.done ? (
              <p className="font-bold">🎉 You’ve used every question in this set!</p>
            ) : (
              <p className="font-semibold text-ink-soft">Pick a grade and subject, then tap Start.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {s.current && !s.revealed && (
              <Button variant="outline" onClick={reveal}><Eye size={16} /> Reveal answer</Button>
            )}
            {s.done ? (
              <Button variant="accent" onClick={() => setS(fresh(c, s.scores))}><RotateCcw size={16} /> New round</Button>
            ) : (
              <Button variant="accent" onClick={next}><SkipForward size={16} /> {s.current ? "Next question" : "Start"}</Button>
            )}
            {c.subject === "custom" && <Button variant="ghost" onClick={() => setEditing(true)}><Pencil size={14} /> Edit questions</Button>}
          </div>
        </>
      )}

      {c.teams && (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl bg-soft p-2 text-center">
              <p className="truncate text-xs font-black uppercase text-ink-soft">{c.teamNames?.[i] || `Team ${i + 1}`}</p>
              <p className="big-digits text-3xl font-black" data-testid={`quiz-score-${i}`}>{s.scores[i]}</p>
              <div className="flex justify-center gap-1">
                <IconButton size="sm" label={`Subtract a point from ${c.teamNames?.[i] || `Team ${i + 1}`}`} onClick={() => score(i as 0 | 1, -1)}>−</IconButton>
                <IconButton size="sm" variant="accent" label={`Add a point to ${c.teamNames?.[i] || `Team ${i + 1}`}`} onClick={() => score(i as 0 | 1, 1)}>+</IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<QuizConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Think time before the answer appears">
        <Segmented label="Think time" value={c.thinkSeconds} onChange={(thinkSeconds) => set({ thinkSeconds })} options={[{ value: 0, label: "Off" }, { value: 5, label: "5 s" }, { value: 10, label: "10 s" }, { value: 20, label: "20 s" }]} />
      </Field>
      <Toggle checked={c.teams} onChange={(teams) => set({ teams })} label="Two-team scoring" />
      {c.teams && (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <input key={i} className={inputCls} value={c.teamNames?.[i] ?? ""} maxLength={20} aria-label={`Team ${i + 1} name`} onChange={(e) => set({ teamNames: (i === 0 ? [e.target.value, c.teamNames?.[1] ?? "Team 2"] : [c.teamNames?.[0] ?? "Team 1", e.target.value]) as [string, string] })} />
          ))}
        </div>
      )}
      <Field label="My questions">
        <CustomEditor id={id} />
      </Field>
    </div>
  );
}

const QuizWidget: WidgetModule = { Body, Settings };
export default QuizWidget;
