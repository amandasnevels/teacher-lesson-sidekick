"use client";
import { useState, type ReactNode } from "react";
import { useSidekick } from "@/store/store";
import { useActiveClass } from "@/store/hooks";
import { DEMO_NAMES } from "@/store/defaults";
import { namesFromPaste } from "@/lib/roster";
import { ensureWidget } from "@/store/actions";
import { Button, EmptyState, inputCls } from "@/components/ui";

/**
 * Student widgets render through this gate. General tools never need a roster;
 * student tools offer quick setup right where the teacher needs it.
 */
export function RosterGate({ children }: { children: ReactNode }) {
  const cls = useActiveClass();
  const [paste, setPaste] = useState("");
  const s = useSidekick.getState;

  if (cls && cls.students.length > 0) return <>{children}</>;

  const createWith = (names: string[], className: string) => {
    const classId = cls?.id ?? s().addClass(className);
    s().setActiveClass(classId);
    const r = s().addStudents(classId, names);
    s().toast({
      message: `Added ${r.names.length} student${r.names.length === 1 ? "" : "s"}${r.duplicates.length ? ` · ${r.duplicates.length} duplicate${r.duplicates.length === 1 ? "" : "s"} skipped` : ""}`,
      tone: "success",
    });
  };

  return (
    <EmptyState emoji="🧑‍🎓" title={cls ? `${cls.name} has no students yet` : "This tool uses a class roster"}>
      <p className="text-sm text-ink-soft">Paste names (one per line) to get started.</p>
      <textarea
        className={`${inputCls} min-h-20 py-2`}
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={"Avery\nBennie\nCam"}
        aria-label="Paste student names"
      />
      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button variant="accent" size="sm" disabled={!paste.trim()} onClick={() => { createWith(namesFromPaste(paste), "My Class"); setPaste(""); }}>
          Add students
        </Button>
        <Button variant="outline" size="sm" onClick={() => ensureWidget("roster", { reveal: true })}>
          Roster manager
        </Button>
        {!cls && (
          <Button variant="ghost" size="sm" onClick={() => createWith(DEMO_NAMES, "Demo Class")}>
            Try demo class
          </Button>
        )}
      </div>
    </EmptyState>
  );
}
