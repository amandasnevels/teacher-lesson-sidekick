"use client";
import { useState } from "react";
import { Check, RotateCcw, Undo2 } from "lucide-react";
import { emptyParticipation, useSidekick } from "@/store/store";
import { useActiveClass } from "@/store/hooks";
import { Button, Segmented, cx } from "@/components/ui";
import { RosterGate } from "../RosterGate";
import type { WidgetModule, WidgetProps } from "../types";

function Body({ id, view }: WidgetProps) {
  return (
    <RosterGate>
      <Inner id={id} big={view === "expanded"} />
    </RosterGate>
  );
}

function Inner({ big }: { id: string; big: boolean }) {
  const cls = useActiveClass()!;
  const data = useSidekick((s) => s.records.participation[cls.id]) ?? emptyParticipation();
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const st = useSidekick.getState;
  const checked = new Set(data.checked.filter((sid) => cls.students.some((s) => s.id === sid)));
  const list = cls.students.filter((s) => (filter === "all" ? true : filter === "done" ? checked.has(s.id) : !checked.has(s.id)));
  const total = cls.students.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-extrabold" data-testid="participation-progress" aria-live="polite">
          {checked.size} of {total} students
        </p>
        <span className="text-xs text-ink-soft">since {new Date(data.lessonStartedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${total ? (checked.size / total) * 100 : 0}%` }} />
      </div>
      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "todo", label: `Not yet (${total - checked.size})` },
          { value: "done", label: `Done (${checked.size})` },
        ]}
      />
      <ul className={cx("grid gap-1.5 overflow-y-auto", big ? "max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(180px,1fr))]" : "max-h-72 grid-cols-[repeat(auto-fill,minmax(130px,1fr))]")}>
        {list.map((s) => {
          const on = checked.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => st().toggleParticipation(cls.id, s.id)}
                className={cx("flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-bold transition", on ? "bg-accent text-on-accent" : "bg-soft hover:brightness-95")}
              >
                <span className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2", on ? "border-white/80" : "border-line bg-card")}>{on && <Check size={14} strokeWidth={3} />}</span>
                <span className="truncate">{s.name}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="col-span-full py-2 text-center text-sm text-ink-soft">{filter === "todo" ? "🎉 Everyone has participated!" : "No students here yet."}</li>}
      </ul>
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" disabled={data.history.length === 0} onClick={() => st().undoParticipation(cls.id)}>
          <Undo2 size={14} /> Undo
        </Button>
        <Button size="sm" variant="outline" onClick={() => st().resetParticipation(cls.id)} disabled={checked.size === 0}>
          <RotateCcw size={14} /> New lesson
        </Button>
      </div>
    </div>
  );
}

const ParticipationWidget: WidgetModule = { Body };
export default ParticipationWidget;
