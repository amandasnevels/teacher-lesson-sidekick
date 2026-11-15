"use client";
import { useRef, useState } from "react";
import { FileUp, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useSelectValue } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { useActiveClass } from "@/store/hooks";
import { DEMO_NAMES } from "@/store/defaults";
import { namesFromCSV, namesFromPaste, validateNames, type ImportResult } from "@/lib/roster";
import { Button, Field, IconButton, Segmented, Toggle, cx, inputCls, useConfirm } from "./ui";

function summary(r: ImportResult) {
  const parts = [`Added ${r.names.length}`];
  if (r.duplicates.length) parts.push(`${r.duplicates.length} duplicate${r.duplicates.length === 1 ? "" : "s"} skipped (${r.duplicates.slice(0, 3).join(", ")}${r.duplicates.length > 3 ? "…" : ""})`);
  if (r.invalid.length) parts.push(`${r.invalid.length} invalid line${r.invalid.length === 1 ? "" : "s"} skipped`);
  return parts.join(" · ");
}

/** Full class + roster management. One authoritative roster per class; stable student ids. */
export function RosterManager({ compact = false }: { compact?: boolean }) {
  const s = useSidekick.getState;
  const cls = useActiveClass();
  const classes = useSelectValue((st) => st.classes.map((c) => ({ id: c.id, name: c.name })));
  const workspaces = useSelectValue((st) => st.workspaces.map((w) => ({ id: w.id, name: w.name })));
  const retention = useSidekick((st) => st.prefs.studentDataRetention);
  const [tab, setTab] = useState<"students" | "add" | "groups" | "class">(cls && cls.students.length === 0 ? "add" : "students");
  const [newName, setNewName] = useState("");
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ file: string; result: ImportResult; raw: string[] } | null>(null);
  const [newClass, setNewClass] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmEl, ask] = useConfirm();

  const addClass = () => {
    const id = s().addClass(newClass || `Class ${classes.length + 1}`);
    s().setActiveClass(id);
    setNewClass("");
    setTab("add");
  };

  if (!cls) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">Create a class to use student tools. Timers and other general tools never need a roster.</p>
        <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); addClass(); }}>
          <input className={inputCls} value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Class name, e.g. Period 2" aria-label="New class name" />
          <Button type="submit" variant="accent">Create</Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => { const id = s().addClass("Demo Class"); s().setActiveClass(id); s().addStudents(id, DEMO_NAMES); }}>
          Try a demo class (fictional names)
        </Button>
      </div>
    );
  }

  const addOne = () => {
    const r = s().addStudents(cls.id, [newName]);
    setMessage(r.names.length ? `Added ${r.names[0]}` : r.duplicates.length ? `${r.duplicates[0]} is already in this class` : "Please type a name");
    setNewName("");
  };

  const onCSV = async (file: File) => {
    if (file.size > 1_000_000) {
      setMessage("That file is too large for a roster (max 1 MB).");
      return;
    }
    const text = await file.text();
    const raw = namesFromCSV(text);
    const result = validateNames(raw, cls.students.map((x) => x.name));
    setCsvPreview({ file: file.name, result, raw });
  };

  return (
    <div className="space-y-3">
      {confirmEl}
      <div className="flex gap-1.5">
        <select className={inputCls} value={cls.id} onChange={(e) => s().setActiveClass(e.target.value)} aria-label="Class to manage">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="flex shrink-0 items-center rounded-xl bg-soft px-3 text-sm font-bold" aria-label={`${cls.students.length} students`}>
          <Users size={16} className="mr-1" />{cls.students.length}
        </span>
      </div>
      <Segmented
        label="Roster sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: "students", label: "Students" },
          { value: "add", label: "Add" },
          { value: "groups", label: "Groups" },
          { value: "class", label: "Class" },
        ]}
      />
      {message && <p role="status" className="rounded-xl bg-soft px-3 py-2 text-sm font-semibold">{message}</p>}

      {tab === "students" && (
        <div className="space-y-1.5">
          {cls.students.length === 0 && <p className="text-sm text-ink-soft">No students yet — use <b>Add</b>.</p>}
          <ul className={cx("space-y-1", compact && "max-h-72 overflow-y-auto pr-1")}>
            {cls.students.map((st) => (
              <li key={st.id} className="flex items-center gap-1.5">
                {editing === st.id ? (
                  <form
                    className="flex flex-1 gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!s().renameStudent(cls.id, st.id, editDraft)) setMessage("That name is empty or already used in this class.");
                      setEditing(null);
                    }}
                  >
                    <input autoFocus className={cx(inputCls, "min-h-10")} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} aria-label={`Rename ${st.name}`} />
                    <Button type="submit" size="sm" variant="accent">Save</Button>
                  </form>
                ) : (
                  <button type="button" className="min-h-10 min-w-0 flex-1 truncate rounded-lg px-2 text-left font-semibold hover:bg-soft" onClick={() => { setEditing(st.id); setEditDraft(st.name); }} aria-label={`Edit ${st.name}`}>
                    {st.name}
                  </button>
                )}
                {cls.groups.length > 0 && (
                  <select
                    className="min-h-10 max-w-28 rounded-lg border-2 border-line bg-card px-1 text-sm"
                    value={st.groupId ?? ""}
                    onChange={(e) => s().setStudentGroup(cls.id, st.id, e.target.value || null)}
                    aria-label={`Group for ${st.name}`}
                  >
                    <option value="">No group</option>
                    {cls.groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <IconButton label={`Remove ${st.name}`} onClick={() => s().removeStudent(cls.id, st.id)}>
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "add" && (
        <div className="space-y-3">
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); addOne(); }}>
            <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Student name" aria-label="Student name" maxLength={60} />
            <Button type="submit" variant="accent" disabled={!newName.trim()}><UserPlus size={16} /> Add</Button>
          </form>
          <Field label="Paste many names" hint="One per line, or separated by commas.">
            <textarea className={cx(inputCls, "min-h-24 py-2")} value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Paste student names" />
          </Field>
          <Button
            variant="accent"
            disabled={!paste.trim()}
            onClick={() => {
              const r = s().addStudents(cls.id, namesFromPaste(paste));
              setMessage(summary(r));
              setPaste("");
            }}
          >
            Add pasted names
          </Button>
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" aria-label="CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCSV(f); e.target.value = ""; }} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp size={16} /> Import CSV…</Button>
            <p className="mt-1 text-xs text-ink-soft">Uses a “Name” column, or “First”/“Last” columns, or the first column. Files stay on this device.</p>
          </div>
          {csvPreview && (
            <div className="space-y-2 rounded-xl border-2 border-line p-3">
              <p className="text-sm font-bold">{csvPreview.file}</p>
              <p className="text-sm">
                {csvPreview.result.names.length} new name{csvPreview.result.names.length === 1 ? "" : "s"}
                {csvPreview.result.duplicates.length > 0 && ` · ${csvPreview.result.duplicates.length} duplicate(s) will be skipped`}
                {csvPreview.result.invalid.length > 0 && ` · ${csvPreview.result.invalid.length} invalid`}
              </p>
              <p className="max-h-20 overflow-y-auto text-xs text-ink-soft">{csvPreview.result.names.slice(0, 40).join(", ")}</p>
              <div className="flex gap-2">
                <Button variant="accent" size="sm" disabled={!csvPreview.result.names.length} onClick={() => { setMessage(summary(s().addStudents(cls.id, csvPreview.raw))); setCsvPreview(null); }}>
                  Import
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCsvPreview(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "groups" && (
        <div className="space-y-2">
          <p className="text-xs text-ink-soft">Groups (tables) are used by the Point Tracker. Assign students on the Students tab.</p>
          <ul className="space-y-1">
            {cls.groups.map((g) => (
              <li key={g.id} className="flex items-center gap-1.5">
                <input className={cx(inputCls, "min-h-10")} defaultValue={g.name} aria-label={`Group name ${g.name}`} onBlur={(e) => s().renameGroup(cls.id, g.id, e.target.value)} />
                <span className="w-10 text-center text-sm font-bold text-ink-soft">{cls.students.filter((x) => x.groupId === g.id).length}</span>
                <IconButton label={`Delete group ${g.name}`} onClick={() => s().removeGroup(cls.id, g.id)}><Trash2 size={16} /></IconButton>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={() => s().addGroup(cls.id, `Table ${cls.groups.length + 1}`)}><Plus size={16} /> Add group</Button>
        </div>
      )}

      {tab === "class" && (
        <div className="space-y-3">
          <Field label="Class name">
            <input key={cls.id} className={inputCls} defaultValue={cls.name} onBlur={(e) => s().renameClass(cls.id, e.target.value)} />
          </Field>
          <Field label="Default workspace" hint="Optional. Switching to this class opens this workspace.">
            <select className={inputCls} value={cls.defaultWorkspaceId ?? ""} onChange={(e) => s().setClassDefaultWorkspace(cls.id, e.target.value || null)}>
              <option value="">Keep current workspace</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); addClass(); }}>
            <input className={inputCls} value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Another class name" aria-label="New class name" />
            <Button type="submit" variant="accent">New class</Button>
          </form>
          <Toggle
            checked={retention === "keep"}
            onChange={(v) => s().setPrefs({ studentDataRetention: v ? "keep" : "session" })}
            label="Save student data on this device"
            description="Off: names and class records are kept only until this tab closes."
          />
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (await ask(`Delete “${cls.name}”, its roster, points, participation and picks? This can't be undone.`, "Delete class")) s().deleteClass(cls.id);
            }}
          >
            <Trash2 size={16} /> Delete class
          </Button>
        </div>
      )}
    </div>
  );
}
