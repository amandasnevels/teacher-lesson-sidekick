"use client";
import { useEffect, useMemo, useState } from "react";
import { isShared, sharedIdOf } from "@/store/workspaceLogic";
import { Search } from "lucide-react";
import { useSidekick } from "@/store/store";
import { parseCommand } from "@/lib/commands";
import { runCommand, runRoutine } from "@/store/actions";
import { ALL_TYPES, DEFINITIONS } from "@/widgets/definitions";
import { Modal, cx, inputCls } from "./ui";

interface Result {
  id: string;
  kind: string;
  label: string;
  emoji: string;
  run: () => void;
}

const EXAMPLES = ["5 min timer", "pick student", "roll dice", "flip coin", "spinner", "checklist", "bell"];

export function buildResults(query: string): Result[] {
  const s = useSidekick.getState();
  const q = query.trim().toLowerCase();
  const out: Result[] = [];
  const cmd = parseCommand(q);
  if (cmd) out.push({ id: "cmd", kind: "Action", label: cmd.label, emoji: "⚡", run: () => runCommand(cmd) });
  if (!q) return out;
  const has = (txt: string) => txt.toLowerCase().includes(q) || q.split(/\s+/).every((w) => txt.toLowerCase().includes(w));

  for (const r of s.routines) if (has(r.name)) out.push({ id: `r-${r.id}`, kind: "Routine", label: `Run “${r.name}”`, emoji: r.icon, run: () => runRoutine(r.id) });

  const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
  for (const id of ws?.widgetIds ?? []) {
    const w = s.widgets[id];
    const d = DEFINITIONS[w.type];
    const name = w.title || d.name;
    if (has(name) || d.keywords.some((k) => k.includes(q)))
      out.push({
        id: `w-${id}`,
        kind: "Go to",
        label: name,
        emoji: d.emoji,
        run: () => {
          if (w.collapsed) s.updateWidget(id, { collapsed: false });
          s.flashWidget(id);
          document.querySelector(`[data-widget-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      });
  }
  for (const t of ALL_TYPES) {
    const d = DEFINITIONS[t];
    if (has(d.name) || d.keywords.some((k) => k.includes(q) || q.includes(k)))
      out.push({ id: `n-${t}`, kind: "Add new", label: d.name, emoji: d.emoji, run: () => s.flashWidget(s.addWidget(t)) });
  }
  for (const f of s.favorites) if (has(f.name)) out.push({ id: `f-${f.id}`, kind: "Favorite", label: f.name, emoji: DEFINITIONS[f.type].emoji, run: () => { const id = s.addFromFavorite(f.id); if (id) s.flashWidget(id); } });
  for (const w of s.workspaces.filter(isShared)) if (has(w.name) && w.id !== sharedIdOf(s, s.activeWorkspaceId)) out.push({ id: `ws-${w.id}`, kind: "Workspace", label: `Switch to ${w.name}`, emoji: "🗂️", run: () => s.setActiveWorkspace(w.id) });
  for (const c of s.classes) if (has(c.name) && c.id !== s.activeClassId) out.push({ id: `c-${c.id}`, kind: "Class", label: `Switch to ${c.name}`, emoji: "🧑‍🎓", run: () => s.setActiveClass(c.id) });
  return out.slice(0, 12);
}

export function QuickFind() {
  const open = useSidekick((s) => s.quickFindOpen);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => (open ? buildResults(q) : []), [q, open]);
  const close = () => useSidekick.getState().setQuickFind(false);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  useEffect(() => setActive(0), [q]);

  const execute = (r: Result | undefined) => {
    if (!r) return;
    close();
    // Run after the dialog closes so focus and scrolling land on the workspace.
    setTimeout(r.run, 0);
  };

  return (
    <Modal open={open} onClose={close} title="Quick Find">
      <div className="space-y-3">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            data-autofocus
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="qf-results"
            aria-activedescendant={results[active] ? `qf-${results[active].id}` : undefined}
            className={cx(inputCls, "pl-10 text-lg")}
            placeholder="Try “5 min timer” or “pick student”"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                execute(results[active]);
              }
            }}
            aria-label="Search widgets or type a command"
          />
        </label>
        {results.length > 0 ? (
          <ul id="qf-results" role="listbox" className="space-y-1">
            {results.map((r, i) => (
              <li key={r.id} id={`qf-${r.id}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => execute(r)}
                  className={cx("flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left", i === active ? "bg-brand text-brand-ink" : "hover:bg-black/5")}
                >
                  <span className="text-xl" aria-hidden>{r.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{r.label}</span>
                  <span className={cx("shrink-0 text-[10px] font-black uppercase tracking-wide", i === active ? "opacity-80" : "text-ink-soft")}>{r.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : q.trim() ? (
          <p className="text-center text-sm text-ink-soft">No matches for “{q}”.</p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-ink-soft">Try</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setQ(ex)} className="min-h-9 rounded-full bg-black/5 px-3 text-sm font-bold hover:bg-black/10 dark:bg-white/10">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
