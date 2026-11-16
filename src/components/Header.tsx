"use client";
import { GraduationCap, LayoutGrid, Plus, Search, Settings2 } from "lucide-react";
import { useState } from "react";
import { useSelectValue } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { IconButton, cx, usePrompt } from "./ui";
import { ClassSwitchDialog, NewWorkspaceDialog } from "./WorkspaceDialogs";
import { isShared, overrideFor, sharedIdOf } from "@/store/workspaceLogic";
import { WORKSPACE_PRESETS, type PresetKind } from "@/store/presets";

export function Header() {
  const s = useSidekick.getState;
  const classes = useSelectValue((st) => st.classes.map((c) => ({ id: c.id, name: c.name, n: c.students.length })));
  const activeClassId = useSidekick((st) => st.activeClassId);
  const sharedWs = useSelectValue((st) => st.workspaces.filter(isShared).map((w) => ({ id: w.id, name: w.name, kind: w.kind ?? null })));
  // All eight presets are always listed (in preset order); ones not opened yet are created on
  // first pick. Other workspaces (duplicates, blank, imported) follow.
  const used = new Set<string>();
  const workspaces: { id: string; name: string }[] = WORKSPACE_PRESETS.map((p) => {
    const ws = sharedWs.find((w) => w.kind === p.kind && !used.has(w.id));
    if (ws) {
      used.add(ws.id);
      return { id: ws.id, name: ws.name };
    }
    return { id: `__preset:${p.kind}`, name: p.name };
  });
  for (const w of sharedWs) if (!used.has(w.id)) workspaces.push({ id: w.id, name: w.name });
  const pickWorkspace = (v: string) => {
    if (v.startsWith("__preset:")) s().openPresetWorkspace(v.slice("__preset:".length) as PresetKind);
    else s().setActiveWorkspace(v);
  };
  // The dropdown shows the shared workspace; a class customization is shown as "(P2 version)".
  const activeWs = useSidekick((st) => sharedIdOf(st, st.activeWorkspaceId));
  const customized = useSidekick((st) => st.workspaces.some((w) => w.id === st.activeWorkspaceId && !!w.baseId));
  const hasSavedCustom = useSidekick((st) => !!overrideFor(st, sharedIdOf(st, st.activeWorkspaceId), st.activeClassId));
  const activeClassName = useSidekick((st) => st.classes.find((c) => c.id === st.activeClassId)?.name ?? "");
  const [newWsOpen, setNewWsOpen] = useState(false);
  const navStyle = useSidekick((st) => st.prefs.navStyle);
  const storageMessage = useSidekick((st) => st.storageMessage);
  const [promptEl, ask] = usePrompt();

  const selectCls =
    "min-h-10 w-full min-w-0 truncate rounded-xl border-2 border-line bg-card pl-2 pr-7 text-sm font-bold text-ink focus:border-brand focus:outline-none";

  return (
    <header className="border-b border-line bg-card/85 px-2.5 pb-2 pt-2 backdrop-blur sm:px-4">
      {promptEl}
      <ClassSwitchDialog />
      <NewWorkspaceDialog open={newWsOpen} onClose={() => setNewWsOpen(false)} />
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="m-0 min-w-0 leading-none">
            <button
              type="button"
              onClick={() => s().openChooser("switch")}
              aria-label="Teacher Sidekick by NevelLabs — open the workspace chooser"
              title="Workspace presets"
              className="block max-w-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/teacher-sidekick-logo-wide.webp"
                alt=""
                width={798}
                height={160}
                className="brand-logo block h-11 w-auto max-w-full object-contain object-left sm:h-12"
              />
            </button>
          </h1>
        </div>
        <IconButton label="Quick Find (Ctrl+K)" onClick={() => s().setQuickFind(true)} variant="outline">
          <Search size={18} />
        </IconButton>
        <button
          type="button"
          onClick={() => s().openLibrary("new")}
          aria-label="Add widget"
          title="Add widget"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-brand font-bold text-brand-ink shadow-sm transition hover:brightness-110 active:scale-95 min-[400px]:w-auto min-[400px]:px-3"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="hidden min-[400px]:inline">Add</span>
        </button>
        <IconButton label="Settings" onClick={() => s().openSettings("general")} variant="outline">
          <Settings2 size={18} />
        </IconButton>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label className="relative min-w-0">
          <span className="mb-0.5 flex items-center gap-1 overflow-hidden whitespace-nowrap px-0.5 text-xs font-extrabold text-ink-soft">
            <GraduationCap size={14} className="shrink-0" aria-hidden /> <span className="truncate">Active Class</span>
          </span>
          <select
            className={selectCls}
            value={activeClassId ?? ""}
            data-testid="class-select"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new") {
                void ask("New class", "Class name", `Class ${classes.length + 1}`, "Create").then((name) => {
                  if (name) s().setActiveClass(s().addClass(name));
                });
              } else if (v === "__manage") s().openSettings("classes");
              else s().setActiveClass(v || null, { prompt: true });
            }}
          >
            {!activeClassId && <option value="">No class</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.n})
              </option>
            ))}
            <option value="__new">＋ New class…</option>
            <option value="__manage">Manage classes…</option>
          </select>
        </label>
        {navStyle === "compact" ? (
          <label className="relative min-w-0">
            <span className="mb-0.5 flex items-center gap-1 overflow-hidden whitespace-nowrap px-0.5 text-xs font-extrabold text-ink-soft">
              <LayoutGrid size={14} className="shrink-0" aria-hidden /> <span className="truncate">Teaching Workspace</span>
            </span>
            <select
              className={selectCls}
              value={activeWs}
              data-testid="workspace-select"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new") setNewWsOpen(true);
                else if (v === "__customize") s().setCustomizeForClass(true);
                else if (v === "__shared") s().setCustomizeForClass(false);
                else if (v === "__manage") s().openSettings("workspaces");
                else pickWorkspace(v);
              }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.id === activeWs && customized ? ` (${activeClassName} version)` : ""}
                </option>
              ))}
              {activeClassId && !customized && (
                <option value="__customize">✏️ Customize for This Class{hasSavedCustom ? " (restore)" : ""}</option>
              )}
              {activeClassId && customized && <option value="__shared">↩️ Use Shared Workspace</option>}
              <option value="__new">＋ New workspace…</option>
              <option value="__manage">Manage workspaces…</option>
            </select>
          </label>
        ) : (
          <div className="no-scrollbar col-span-2 row-start-2 -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Workspaces">
            {workspaces.map((w) => (
              <button
                key={w.id}
                role="tab"
                aria-selected={w.id === activeWs}
                onClick={() => pickWorkspace(w.id)}
                className={cx("min-h-9 shrink-0 rounded-full px-3 text-sm font-bold", w.id === activeWs ? "bg-brand text-brand-ink" : "bg-black/5 dark:bg-white/10")}
              >
                {w.name}
              </button>
            ))}
            <button className="min-h-9 shrink-0 rounded-full px-3 text-sm font-bold text-ink-soft" onClick={() => s().openSettings("workspaces")}>
              Manage…
            </button>
          </div>
        )}
      </div>
      {storageMessage && (
        <p role="alert" className="mt-2 rounded-lg bg-[#fff5cc] px-2 py-1 text-xs font-semibold text-[#5c4300]">
          {storageMessage}
        </p>
      )}
    </header>
  );
}
