"use client";
import { Shuffle, Save } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useActiveClass, useConfig, useSession } from "@/store/hooks";
import { makeGroups } from "@/lib/random";
import { Button, Segmented, useConfirm, cx } from "@/components/ui";
import { RosterGate } from "../RosterGate";
import type { WidgetModule, WidgetProps } from "../types";

interface GroupsConfig {
  mode: "pairs" | "groups";
  size: number;
}
interface GroupsSession {
  classId: string;
  groups: string[][];
}

function Body({ id, view }: WidgetProps) {
  return (
    <RosterGate>
      <Inner id={id} big={view === "expanded"} />
    </RosterGate>
  );
}

function Inner({ id, big }: { id: string; big: boolean }) {
  const [c, set] = useConfig<GroupsConfig>(id);
  const [s, setS] = useSession<GroupsSession>(id);
  const cls = useActiveClass()!;
  const [confirmEl, ask] = useConfirm();
  const valid = s && s.classId === cls.id ? s.groups.map((g) => g.filter((sid) => cls.students.some((x) => x.id === sid))).filter((g) => g.length) : null;
  const nameOf = (sid: string) => cls.students.find((x) => x.id === sid)?.name ?? "";
  const size = c.mode === "pairs" ? 2 : c.size;

  return (
    <div className="space-y-3">
      {confirmEl}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Group type" value={c.mode} onChange={(mode) => set({ mode })} options={[{ value: "pairs", label: "Pairs" }, { value: "groups", label: "Groups" }]} />
        {c.mode === "groups" && (
          <label className="flex items-center gap-1 text-sm font-bold">
            Size
            <select className="min-h-9 rounded-lg border-2 border-line bg-card px-1" value={c.size} onChange={(e) => set({ size: Number(e.target.value) })} aria-label="Group size">
              {[3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <Button variant="accent" onClick={() => setS({ classId: cls.id, groups: makeGroups(cls.students.map((x) => x.id), size) })}>
        <Shuffle size={18} /> Make {c.mode === "pairs" ? "pairs" : "groups"}
      </Button>
      {valid && (
        <>
          <ol className={cx("grid gap-2", big ? "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]")} data-testid="group-list">
            {valid.map((g, i) => (
              <li key={i} className="pop-in rounded-xl bg-soft p-2">
                <p className="text-xs font-black uppercase text-ink-soft">{c.mode === "pairs" ? "Pair" : "Group"} {i + 1}</p>
                <ul className={cx("font-bold", big && "text-xl")}>
                  {g.map((sid) => (
                    <li key={sid} className="truncate">{nameOf(sid)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (await ask("Use these as the class's table groups? This replaces the current groups in the roster (you can undo).", "Use as table groups")) {
                useSidekick.getState().setGroupsFromAssignments(cls.id, valid);
              }
            }}
          >
            <Save size={14} /> Use as table groups
          </Button>
        </>
      )}
    </div>
  );
}

const GroupsWidget: WidgetModule = { Body };
export default GroupsWidget;
