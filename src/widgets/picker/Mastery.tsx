"use client";
/**
 * Name Picker → Mastery check ("correct / incorrect").
 *  - The teacher picks which I Can / I Will objective is being checked.
 *  - Students who haven't been called come first; then students who need reteach get another turn.
 *  - Correct: +1 point for the student, a pop-up with their name and a random sticker.
 *  - Incorrect: quietly marked "needs reteach" in the tracker (nothing is shown to the class).
 *  - Absent: skipped for this check.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardList, Shuffle, UserX, X } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useReducedMotion, useSelectValue } from "@/store/hooks";
import { STICKERS, activeCheck, masterySummary, nextMasteryStudent, type MasteryCheck } from "@/lib/mastery";
import { randomInt } from "@/lib/random";
import { playSound } from "@/lib/audio";
import { Button, Confetti, Modal, cx, inputCls } from "@/components/ui";
import type { ClassRoom } from "@/lib/types";

interface Objective {
  text: string;
  code?: string | null;
  teksId?: string | null;
}

/** Objectives from every I Can / I Will widget (deduplicated). */
function useObjectives(): Objective[] {
  return useSelectValue((s) => {
    const seen = new Set<string>();
    const out: Objective[] = [];
    for (const w of Object.values(s.widgets)) {
      if (w.removedAt || (w.type !== "ican" && w.type !== "iwill")) continue;
      for (const it of (w.config.items as { text: string; code?: string | null; teksId?: string | null }[]) ?? []) {
        const key = it.teksId || it.text;
        if (!it.text || seen.has(key)) continue;
        seen.add(key);
        out.push({ text: it.text, code: it.code ?? null, teksId: it.teksId ?? null });
      }
    }
    return out;
  });
}

export function ObjectivePicker({ cls, onStarted, onCancel }: { cls: ClassRoom; onStarted?: () => void; onCancel?: () => void }) {
  const objectives = useObjectives();
  const [typed, setTyped] = useState("");
  const start = (o: Objective) => {
    useSidekick.getState().startMasteryCheck(cls.id, o);
    onStarted?.();
  };
  return (
    <div className="space-y-2 text-left" data-testid="mastery-objective">
      <p className="text-sm font-extrabold">Which objective are we checking with {cls.name}?</p>
      {objectives.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {objectives.map((o) => (
            <li key={o.teksId || o.text}>
              <button type="button" onClick={() => start(o)} className="w-full rounded-xl bg-soft px-2.5 py-1.5 text-left text-sm font-semibold hover:brightness-95">
                {o.code && <span className="mr-1 text-xs font-black text-ink-soft">{o.code}</span>}
                {o.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-soft">Tip: objectives from your I Can and I Will widgets show up here.</p>
      )}
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) start({ text: typed.trim() });
        }}
      >
        <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type an objective…" aria-label="Objective" maxLength={400} />
        <Button type="submit" variant="soft" disabled={!typed.trim()}>
          Start
        </Button>
      </form>
      {onCancel && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}

export function MasteryPicker({ cls, big }: { cls: ClassRoom; big: boolean }) {
  const data = useSidekick((s) => s.records.mastery?.[cls.id]);
  const check = activeCheck(data);
  const [changing, setChanging] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  if (!check || changing)
    return (
      <div className="space-y-2">
        <ObjectivePicker cls={cls} onStarted={() => setChanging(false)} onCancel={check ? () => setChanging(false) : undefined} />
        <TrackerButton onClick={() => setTrackerOpen(true)} />
        {trackerOpen && <MasteryTracker cls={cls} onClose={() => setTrackerOpen(false)} />}
      </div>
    );
  return (
    <>
      <MasteryRound key={check.id} cls={cls} check={check} big={big} onChangeObjective={() => setChanging(true)} onTracker={() => setTrackerOpen(true)} />
      {trackerOpen && <MasteryTracker cls={cls} onClose={() => setTrackerOpen(false)} />}
    </>
  );
}

function TrackerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick}>
      <ClipboardList size={14} /> Mastery tracker
    </Button>
  );
}

function MasteryRound({ cls, check, big, onChangeObjective, onTracker }: { cls: ClassRoom; check: MasteryCheck; big: boolean; onChangeObjective: () => void; onTracker: () => void }) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState<string | null>(null);
  const [display, setDisplay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<{ name: string; sticker: (typeof STICKERS)[number]; n: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const ids = cls.students.map((s) => s.id);
  const nameOf = (sid: string | null) => cls.students.find((s) => s.id === sid)?.name ?? "";
  const sum = masterySummary(ids, check.results);
  const peek = nextMasteryStudent(ids, check.results, current);
  const st = useSidekick.getState;

  const pick = () => {
    if (busy) return;
    const { id } = nextMasteryStudent(ids, check.results, current);
    if (!id) return;
    setCelebrate(null);
    if (reduced) {
      setDisplay(id);
      setCurrent(id);
      return;
    }
    setBusy(true);
    let delay = 40;
    let t = 0;
    for (let i = 0; i < 12; i++) {
      t += delay;
      delay *= 1.18;
      const last = i === 11;
      timers.current.push(
        setTimeout(() => {
          if (last) {
            setDisplay(id);
            setCurrent(id);
            setBusy(false);
          } else setDisplay(ids[randomInt(ids.length)]);
        }, t),
      );
    }
  };

  const mark = (status: "correct" | "reteach" | "absent") => {
    if (!current) return;
    st().recordMastery(cls.id, check.id, current, status);
    if (status === "correct") {
      st().addPoints(cls.id, { kind: "student", id: current }, 1, "Mastery");
      setCelebrate({ name: nameOf(current), sticker: STICKERS[randomInt(STICKERS.length)], n: Date.now() });
      setBurst((b) => b + 1);
      playSound("ding");
      timers.current.push(setTimeout(() => setCelebrate(null), 2600));
    }
    // Incorrect / absent: quietly reset for the next student.
    setCurrent(null);
    setDisplay(null);
  };

  return (
    <div className="relative space-y-2 text-center" data-testid="mastery-round">
      <Confetti burst={burst} />
      <div className="flex items-start gap-1 rounded-xl bg-soft/70 px-2 py-1 text-left">
        <p className="min-w-0 flex-1 text-xs font-semibold" title={check.objective}>
          <span className="font-black text-ink-soft">Checking: </span>
          {check.code && <span className="font-black">{check.code} </span>}
          <span className="line-clamp-2">{check.objective}</span>
        </p>
        <button type="button" className="shrink-0 text-xs font-bold underline" onClick={onChangeObjective}>
          Change
        </button>
      </div>

      <div className="relative flex min-h-24 items-center justify-center overflow-hidden rounded-2xl bg-soft px-3" aria-live="polite" aria-atomic="true">
        {celebrate ? (
          <div className="pop-in py-2" data-testid="mastery-celebrate" key={celebrate.n}>
            <p className={cx("leading-none", big ? "text-7xl" : "text-5xl")} aria-hidden>
              {celebrate.sticker.emoji}
            </p>
            <p className={cx("font-black", big ? "text-4xl" : "text-xl")}>{celebrate.sticker.text}</p>
            <p className={cx("font-extrabold", big ? "text-2xl" : "text-base")}>
              {celebrate.name} <span className="rounded-full bg-accent px-2 py-0.5 text-on-accent">+1 point</span>
            </p>
          </div>
        ) : display ? (
          <p className={cx("font-black leading-tight", busy && "opacity-60", big ? "text-6xl" : "text-3xl")} data-testid="picked-name" data-final={!busy}>
            {nameOf(display)}
          </p>
        ) : peek.phase === "done" ? (
          <p className="font-bold">🎉 Everyone has answered! Start a new check when you&rsquo;re ready.</p>
        ) : (
          <p className="font-semibold text-ink-soft">Tap Pick to call a student</p>
        )}
      </div>

      {current && !busy ? (
        <div className="grid grid-cols-3 gap-1.5">
          <Button variant="accent" onClick={() => mark("correct")} aria-label={`Correct: ${nameOf(current)}`}>
            <Check size={18} strokeWidth={3} /> Correct
          </Button>
          <Button variant="outline" onClick={() => mark("reteach")} aria-label={`Incorrect: ${nameOf(current)}`}>
            <X size={18} strokeWidth={3} /> Incorrect
          </Button>
          <Button variant="ghost" onClick={() => mark("absent")} aria-label={`Absent: ${nameOf(current)}`}>
            <UserX size={16} /> Absent
          </Button>
        </div>
      ) : (
        <Button variant="accent" size={big ? "lg" : "md"} onClick={pick} disabled={busy || peek.phase === "done"} className="min-w-28">
          <Shuffle size={18} /> Pick
        </Button>
      )}
      <p className="text-xs font-semibold text-ink-soft" data-testid="mastery-progress">
        {peek.phase === "reteach" ? "Second chances round · " : ""}
        {sum.total - sum.notYet} of {sum.total} called
      </p>
      <div className="flex justify-center">
        <TrackerButton onClick={onTracker} />
      </div>
    </div>
  );
}

const STATUS_LABEL = {
  correct: { label: "✓ Mastered", cls: "bg-[#d9f7e6] text-[#0f5132]" },
  reteach: { label: "↻ Needs reteach", cls: "bg-[#ffe9cc] text-[#7a3d00]" },
  absent: { label: "Absent", cls: "bg-black/10 text-ink" },
} as const;

/** Teacher-only tracker: every mastery check for this class, with each student's result. */
export function MasteryTracker({ cls, onClose }: { cls: ClassRoom; onClose: () => void }) {
  const checks = useSidekick((s) => s.records.mastery?.[cls.id]?.checks) ?? [];
  const sorted = useMemo(() => checks.slice().reverse(), [checks]);
  const [sel, setSel] = useState<string | null>(null);
  const check = sorted.find((c) => c.id === sel) ?? sorted[0] ?? null;
  const ids = cls.students.map((s) => s.id);
  const sum = check ? masterySummary(ids, check.results) : null;
  const st = useSidekick.getState;
  const order = { reteach: 0, undefined: 1, absent: 2, correct: 3 } as Record<string, number>;
  const rows = check ? cls.students.slice().sort((a, b) => (order[String(check.results[a.id]?.status)] ?? 1) - (order[String(check.results[b.id]?.status)] ?? 1) || a.name.localeCompare(b.name)) : [];
  return (
    <Modal open onClose={onClose} wide title={`Mastery tracker · ${cls.name}`}>
      <div className="space-y-3" data-testid="mastery-tracker">
        <p className="text-xs text-ink-soft">Only you see this. Results stay on this device with {cls.name}&rsquo;s class records.</p>
        {!check ? (
          <p className="text-sm">No mastery checks yet. Turn on “Correct / incorrect” in the Name Picker to start one.</p>
        ) : (
          <>
            <select className={inputCls} aria-label="Mastery check" value={check.id} onChange={(e) => setSel(e.target.value)}>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {new Date(c.startedAt).toLocaleDateString([], { month: "short", day: "numeric" })} · {c.code ? `${c.code} ` : ""}
                  {c.objective.slice(0, 70)}
                  {c.endedAt ? "" : " (in progress)"}
                </option>
              ))}
            </select>
            <p className="text-sm font-semibold">{check.objective}</p>
            {sum && (
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                <span className={cx("rounded-full px-2 py-1", STATUS_LABEL.correct.cls)}>{sum.correct} mastered</span>
                <span className={cx("rounded-full px-2 py-1", STATUS_LABEL.reteach.cls)}>{sum.reteach} need reteach</span>
                <span className={cx("rounded-full px-2 py-1", STATUS_LABEL.absent.cls)}>{sum.absent} absent</span>
                <span className="rounded-full bg-soft px-2 py-1">{sum.notYet} not called</span>
              </div>
            )}
            <ul className="divide-y divide-line rounded-xl border-2 border-line">
              {rows.map((s) => {
                const r = check.results[s.id];
                const lab = r ? STATUS_LABEL[r.status] : null;
                return (
                  <li key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm" data-testid={`mastery-row-${s.name}`}>
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                    {r?.afterReteach && <span className="text-xs text-ink-soft">after reteach</span>}
                    {r && r.tries > 1 && <span className="text-xs text-ink-soft">{r.tries} tries</span>}
                    <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", lab ? lab.cls : "bg-soft text-ink-soft")}>{lab ? lab.label : "Not called"}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {!check.endedAt && (
                <Button size="sm" variant="outline" onClick={() => st().endMasteryCheck(cls.id, check.id)}>
                  End this check
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => st().deleteMasteryCheck(cls.id, check.id)}>
                Delete check
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
