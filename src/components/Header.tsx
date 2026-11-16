"use client";
import { Plus, Search, Settings2 } from "lucide-react";
import { useSelectValue } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { IconButton, cx, usePrompt } from "./ui";

export function Header() {
  const s = useSidekick.getState;
  const classes = useSelectValue((st) => st.classes.map((c) => ({ id: c.id, name: c.name, n: c.students.length })));
  const activeClassId = useSidekick((st) => st.activeClassId);
  const workspaces = useSelectValue((st) => st.workspaces.map((w) => ({ id: w.id, name: w.name })));
  const activeWs = useSidekick((st) => st.activeWorkspaceId);
  const navStyle = useSidekick((st) => st.prefs.navStyle);
  const storageMessage = useSidekick((st) => st.storageMessage);
  const [promptEl, ask] = usePrompt();

  const selectCls =
    "min-h-10 w-full min-w-0 truncate rounded-xl border-2 border-line bg-card pl-2 pr-7 text-sm font-bold text-ink focus:border-brand focus:outline-none";

  return (
    <header className="border-b border-line bg-card/85 px-2.5 pb-2 pt-2 backdrop-blur sm:px-4">
      {promptEl}
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="m-0 min-w-0 leading-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/teacher-sidekick-logo-wide.webp"
              alt="Teacher Sidekick by NevelLabs"
              width={798}
              height={160}
              className="brand-logo block h-11 w-auto sm:h-12 max-w-full object-contain object-left"
            />
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
          <span className="sr-only">Class</span>
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
              else s().setActiveClass(v || null);
            }}
          >
            {!activeClassId && <option value="">🧑‍🎓 No class</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                🧑‍🎓 {c.name} ({c.n})
              </option>
            ))}
            <option value="__new">＋ New class…</option>
            <option value="__manage">Manage classes…</option>
          </select>
        </label>
        {navStyle === "compact" ? (
          <label className="relative min-w-0">
            <span className="sr-only">Workspace</span>
            <select
              className={selectCls}
              value={activeWs}
              data-testid="workspace-select"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new") {
                  void ask("New workspace", "Workspace name", "New workspace", "Create").then((name) => {
                    if (name) s().addWorkspace(name);
                  });
                } else if (v === "__manage") s().openSettings("workspaces");
                else s().setActiveWorkspace(v);
              }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  🗂️ {w.name}
                </option>
              ))}
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
                onClick={() => s().setActiveWorkspace(w.id)}
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
