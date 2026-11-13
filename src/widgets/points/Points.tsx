"use client";
import { useEffect, useState } from "react";
import { Minus, Plus, RotateCcw, Undo2 } from "lucide-react";
import { emptyPoints, useSidekick } from "@/store/store";
import { useActiveClass, useConfig } from "@/store/hooks";
import { dayKey, weekKey } from "@/lib/time";
import { Button, Confetti, EmptyState, Field, IconButton, Segmented, Toggle, cx, inputCls, useConfirm } from "@/components/ui";
import { RosterGate } from "../RosterGate";
import type { WidgetModule, WidgetProps } from "../types";

interface PointsConfig {
  mode: "class" | "groups" | "students";
  step: number;
  categories: string[];
  goal: number;
  celebrate: boolean;
  resetMode: "manual" | "daily" | "weekly";
}

function periodKeyFor(mode: PointsConfig["resetMode"]) {
  return mode === "daily" ? dayKey() : mode === "weekly" ? weekKey() : undefined;
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<PointsConfig>(id);
  const cls = useActiveClass();
  if (!cls) {
    return (
      <EmptyState emoji="⭐" title="Points are saved per class">
        <Button variant="accent" size="sm" onClick={() => useSidekick.getState().setActiveClass(useSidekick.getState().addClass("My Class"))}>
          Create a class
        </Button>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-3">
      <Segmented
        label="Point mode"
        value={c.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "class", label: "Class" },
          { value: "groups", label: "Tables" },
          { value: "students", label: "Students" },
        ]}
      />
      {c.mode === "class" ? (
        <PointsInner id={id} big={view === "expanded"} />
      ) : (
        <RosterGate>
          <PointsInner id={id} big={view === "expanded"} />
        </RosterGate>
      )}
    </div>
  );
}

function PointsInner({ id, big }: { id: string; big: boolean }) {
  const [c, set] = useConfig<PointsConfig>(id);
  const cls = useActiveClass()!;
  const data = useSidekick((s) => s.records.points[cls.id]) ?? emptyPoints();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [burst, setBurst] = useState(0);
  const [confirmEl, ask] = useConfirm();
  const st = useSidekick.getState;

  // Automatic daily/weekly reset — only when the teacher chose it.
  const pk = periodKeyFor(c.resetMode);
  useEffect(() => {
    if (!pk) return;
    if (data.periodKey !== pk && (data.history.length > 0 || data.whole !== 0)) st().resetPoints(cls.id, pk);
    else if (data.periodKey !== pk) useSidekick.setState((s) => ({ records: { ...s.records, points: { ...s.records.points, [cls.id]: { ...data, periodKey: pk } } } }));
  }, [pk, data, cls.id, st]);

  const award = (target: { kind: "student" | "group" | "class"; id: string }, sign: 1 | -1) => {
    const before = target.kind === "class" ? data.whole : 0;
    st().addPoints(cls.id, target, sign * c.step, category);
    if (target.kind === "class" && c.celebrate && c.goal > 0 && before < c.goal && before + sign * c.step >= c.goal) {
      setBurst((b) => b + 1);
      st().toast({ message: `🎉 Goal reached: ${c.goal} points!`, tone: "success" });
    }
  };

  const groupTotal = (gid: string) => data.groups[gid] ?? 0;

  return (
    <div className="relative space-y-3">
      {confirmEl}
      <Confetti burst={burst} />
      {c.categories.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          {c.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setCategory(category === cat ? undefined : cat)}
              className={cx("min-h-8 rounded-full px-3 text-xs font-bold", category === cat ? "bg-accent text-on-accent" : "bg-soft")}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {c.mode === "class" && (
        <div className="text-center">
          <p className={cx("big-digits font-black", big ? "text-8xl" : "text-5xl")} data-testid="class-points" aria-label={`Class points ${data.whole}`}>
            {data.whole}
          </p>
          {c.goal > 0 && (
            <>
              <div className="mx-auto mt-2 h-3 max-w-xs overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (data.whole / c.goal) * 100)}%` }} />
              </div>
              <p className="mt-1 text-sm font-semibold text-ink-soft">Goal: {c.goal}</p>
            </>
          )}
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="outline" onClick={() => award({ kind: "class", id: cls.id }, -1)} aria-label={`Subtract ${c.step} class points`}>
              <Minus size={18} />
            </Button>
            <Button variant="accent" size="lg" onClick={() => award({ kind: "class", id: cls.id }, 1)} aria-label={`Add ${c.step} class points`}>
              <Plus size={20} /> {c.step}
            </Button>
          </div>
        </div>
      )}

      {c.mode === "groups" &&
        (cls.groups.length === 0 ? (
          <p className="text-sm text-ink-soft">No tables yet. Add groups in the Class Roster (Groups tab), or use the Group Maker.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {cls.groups.map((g) => (
              <li key={g.id} className="rounded-xl bg-soft p-2 text-center">
                <p className="truncate text-sm font-bold">{g.name}</p>
                <p className="big-digits text-3xl font-black">{groupTotal(g.id)}</p>
                <div className="flex justify-center gap-1">
                  <IconButton label={`Subtract from ${g.name}`} size="md" onClick={() => award({ kind: "group", id: g.id }, -1)}>
                    <Minus size={16} />
                  </IconButton>
                  <IconButton label={`Add to ${g.name}`} variant="accent" size="md" onClick={() => award({ kind: "group", id: g.id }, 1)}>
                    <Plus size={16} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {c.mode === "students" && (
        <ul className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1.5 overflow-y-auto">
          {cls.students.map((s) => (
            <li key={s.id} className="flex items-center gap-1 rounded-xl bg-soft p-1">
              <button type="button" className="min-h-10 min-w-0 flex-1 truncate rounded-lg px-1 text-left text-sm font-bold hover:bg-black/5" onClick={() => award({ kind: "student", id: s.id }, 1)} aria-label={`Add point to ${s.name}`}>
                {s.name}
              </button>
              <span className="big-digits w-7 text-center font-black" data-testid={`student-points-${s.name}`}>{data.students[s.id] ?? 0}</span>
              <IconButton label={`Subtract point from ${s.name}`} size="sm" onClick={() => award({ kind: "student", id: s.id }, -1)}>
                <Minus size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <Segmented label="Point value" value={c.step} onChange={(step) => set({ step })} options={[1, 2, 5].map((n) => ({ value: n, label: `±${n}` }))} />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" disabled={data.history.length === 0} onClick={() => st().undoLastPoints(cls.id)}>
            <Undo2 size={14} /> Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (await ask(`Reset all points for ${cls.name}? You can undo right after.`, "Reset points")) st().resetPoints(cls.id, periodKeyFor(c.resetMode));
            }}
          >
            <RotateCcw size={14} /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<PointsConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Class goal" hint="0 hides the goal.">
        <input type="number" min={0} max={10000} className={inputCls} value={c.goal} onChange={(e) => set({ goal: Math.max(0, Number(e.target.value) || 0) })} />
      </Field>
      <Field label="Categories" hint="Comma separated, e.g. Teamwork, Kindness.">
        <input className={inputCls} defaultValue={c.categories.join(", ")} onBlur={(e) => set({ categories: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8) })} />
      </Field>
      <Field label="Automatic reset" hint="Points are kept per class; resets never touch other classes.">
        <Segmented label="Automatic reset" value={c.resetMode} onChange={(resetMode) => set({ resetMode })} options={[{ value: "manual", label: "Manual" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} />
      </Field>
      <Toggle checked={c.celebrate} onChange={(celebrate) => set({ celebrate })} label="Celebrate when the goal is reached" />
    </div>
  );
}

const PointsWidget: WidgetModule = { Body, Settings };
export default PointsWidget;
