"use client";
import { useRef, useState } from "react";
import { isShared, sharedIdOf } from "@/store/workspaceLogic";
import { NewWorkspaceDialog } from "./WorkspaceDialogs";
import { ArrowDown, ArrowUp, Copy, Download, Pencil, Play, Plus, Trash2, Upload, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { persistedSnapshot, useSidekick, type SettingsTab } from "@/store/store";
import { DOCK_ACTIONS, dockItemInfo, runRoutine } from "@/store/actions";
import { THEMES } from "@/lib/themes";
import { buildSettingsPack, importSettingsPack } from "@/lib/exportPack";
import type { DockActionId, DockPosition } from "@/lib/types";
import { DEFINITIONS } from "@/widgets/definitions";
import { SHORTCUTS } from "./engines/Shortcuts";
import { RosterManager } from "./RosterManager";
import { SideBySideGuide } from "./SideBySide";
import { Button, Field, IconButton, Modal, Segmented, Toggle, cx, inputCls, useConfirm, usePrompt } from "./ui";

export function SettingsPanel() {
  const open = useSidekick((s) => s.settings.open);
  const tab = useSidekick((s) => s.settings.tab);
  const s = useSidekick.getState;
  return (
    <Modal open={open} onClose={() => s().closeSettings()} title="Settings" wide footer={<Button variant="primary" onClick={() => s().closeSettings()}>Close</Button>}>
      <div className="space-y-4">
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Settings sections">
          {(
            [
              ["general", "General"],
              ["classes", "Classes"],
              ["workspaces", "Workspaces"],
              ["routines", "Routines"],
              ["dock", "Quick Dock"],
              ["data", "Data & Privacy"],
            ] as [SettingsTab, string][]
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => s().openSettings(k)} className={cx("min-h-10 shrink-0 rounded-full px-3 text-sm font-bold", tab === k ? "bg-brand text-brand-ink" : "bg-black/5 dark:bg-white/10")}>
              {label}
            </button>
          ))}
        </div>
        {tab === "general" && <GeneralTab />}
        {tab === "classes" && <RosterManager />}
        {tab === "workspaces" && <WorkspacesTab />}
        {tab === "routines" && <RoutinesTab />}
        {tab === "dock" && <DockTab />}
        {tab === "data" && <DataTab />}
      </div>
    </Modal>
  );
}

function GeneralTab() {
  const prefs = useSidekick((s) => s.prefs);
  const set = useSidekick.getState().setPrefs;
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-2xl border-2 border-line p-3" aria-labelledby="sbs-settings">
        <h3 id="sbs-settings" className="font-extrabold">🪟 Use Sidekick beside your lesson</h3>
        <SideBySideGuide compact />
      </section>
      <Field label="Theme">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={prefs.themeId === t.id}
              onClick={() => set({ themeId: t.id })}
              className={cx("flex items-center gap-2 rounded-2xl border-2 p-2 text-left text-sm font-bold", prefs.themeId === t.id ? "border-brand" : "border-line")}
            >
              <span className="flex -space-x-1.5" aria-hidden>
                {t.swatches.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border-2 border-white" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 truncate">{t.emoji} {t.name}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Quick Dock position">
        <Segmented<DockPosition> label="Quick Dock position" value={prefs.dockPosition} onChange={(dockPosition) => set({ dockPosition })} options={[{ value: "bottom", label: "Bottom" }, { value: "top", label: "Top" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
      </Field>
      <Field label="Workspace navigation">
        <Segmented label="Workspace navigation" value={prefs.navStyle} onChange={(navStyle) => set({ navStyle })} options={[{ value: "compact", label: "Compact menu" }, { value: "tabs", label: "Tabs" }]} />
      </Field>
      <Field label="Motion">
        <Segmented label="Motion" value={prefs.reducedMotion} onChange={(reducedMotion) => set({ reducedMotion })} options={[{ value: "system", label: "Match device" }, { value: "on", label: "Reduce" }, { value: "off", label: "Full" }]} />
      </Field>
      <Field label={`Sound volume ${Math.round(prefs.volume * 100)}%`}>
        <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="w-full accent-[var(--brand)]" aria-label="Volume" />
      </Field>
      <Toggle checked={prefs.muted} onChange={(muted) => set({ muted })} label="Mute all sounds" />
      <Button variant="ghost" size="sm" onClick={() => setMore(!more)} aria-expanded={more}>
        {more ? "Fewer options" : "More options…"}
      </Button>
      {more && (
        <div className="space-y-3 rounded-2xl border-2 border-line p-3">
          <Toggle checked={prefs.shortcutsEnabled} onChange={(shortcutsEnabled) => set({ shortcutsEnabled })} label="Keyboard shortcuts" />
          <ul className="space-y-1 text-sm">
            {SHORTCUTS.map((k) => (
              <li key={k.keys} className="flex justify-between gap-2">
                <span>{k.label}</span>
                <kbd className="shrink-0 rounded-md bg-black/5 px-1.5 font-mono text-xs dark:bg-white/10">{k.keys}</kbd>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-soft">Custom key bindings are planned; these defaults avoid common browser shortcuts.</p>
        </div>
      )}
    </div>
  );
}

function WorkspacesTab() {
  const workspaces = useSidekick(useShallow((s) => s.workspaces.filter(isShared)));
  const active = useSidekick((s) => sharedIdOf(s, s.activeWorkspaceId));
  const [newOpen, setNewOpen] = useState(false);
  const s = useSidekick.getState;
  const [confirmEl, ask] = useConfirm();
  const [promptEl, prompt] = usePrompt();
  return (
    <div className="space-y-3">
      {confirmEl}
      {promptEl}
      <p className="text-sm text-ink-soft">A teaching workspace is how you teach: its widgets, layout and Quick Dock. Every class shares it; use “Customize for This Class” in the workspace menu to give one class its own version.</p>
      <NewWorkspaceDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <ul className="space-y-1.5">
        {workspaces.map((w) => (
          <li key={w.id} className={cx("flex items-center gap-1.5 rounded-2xl border-2 p-1.5", w.id === active ? "border-brand" : "border-line")}>
            <input className={cx(inputCls, "min-h-10 border-transparent")} defaultValue={w.name} aria-label={`Workspace name ${w.name}`} onBlur={(e) => s().renameWorkspace(w.id, e.target.value)} />
            <span className="shrink-0 text-xs font-bold text-ink-soft">{w.widgetIds.length}</span>
            {w.id !== active && (
              <Button size="sm" variant="soft" onClick={() => s().setActiveWorkspace(w.id)}>
                Open
              </Button>
            )}
            <IconButton label={`Duplicate ${w.name}`} onClick={() => s().addWorkspace(`${w.name} copy`, w.id)}>
              <Copy size={16} />
            </IconButton>
            <IconButton
              label={`Delete ${w.name}`}
              disabled={workspaces.length <= 1}
              onClick={async () => {
                if (await ask(`Delete the workspace “${w.name}”? Its widgets move to Removed Widgets, where you can restore them.`, "Delete workspace")) s().deleteWorkspace(w.id);
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      <Button
        variant="primary"
        onClick={() => setNewOpen(true)}
      >
        <Plus size={16} /> New workspace
      </Button>
    </div>
  );
}

function RoutinesTab() {
  const routines = useSidekick((s) => s.routines);
  const shortcutId = useSidekick((s) => s.prefs.shortcutRoutineId);
  const s = useSidekick.getState;
  const [confirmEl, ask] = useConfirm();
  return (
    <div className="space-y-3">
      {confirmEl}
      <p className="text-sm text-ink-soft">A Quick Routine runs several actions with one tap. It never deletes student records.</p>
      <ul className="space-y-1.5">
        {routines.map((r) => (
          <li key={r.id} className="flex items-center gap-1.5 rounded-2xl border-2 border-line p-1.5">
            <span className="text-2xl" aria-hidden>{r.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{r.name}</span>
              <span className="block text-xs text-ink-soft">{r.actions.length} action{r.actions.length === 1 ? "" : "s"}</span>
            </span>
            <IconButton label={`Run ${r.name}`} variant="soft" onClick={() => { s().closeSettings(); runRoutine(r.id); }}>
              <Play size={16} />
            </IconButton>
            <IconButton label={`Edit ${r.name}`} onClick={() => s().openRoutineEditor(r.id)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton label={`Delete ${r.name}`} onClick={async () => { if (await ask(`Delete the routine “${r.name}”?`)) s().deleteRoutine(r.id); }}>
              <Trash2 size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="primary" onClick={() => s().openRoutineEditor(null, "template")}>Start from a template</Button>
        <Button variant="outline" onClick={() => s().openRoutineEditor(null, "blank")}>Pick actions</Button>
        <Button variant="outline" onClick={() => s().openRoutineEditor(null, "fromCurrent")}>From current setup</Button>
      </div>
      <Field label="Shortcut routine (Alt+Shift+R)">
        <select className={inputCls} value={shortcutId ?? ""} onChange={(e) => s().setPrefs({ shortcutRoutineId: e.target.value || null })}>
          <option value="">First routine in the list</option>
          {routines.map((r) => (
            <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function DockTab() {
  const dock = useSidekick((s) => s.dock);
  const routines = useSidekick((s) => s.routines);
  const favorites = useSidekick((s) => s.favorites);
  const widgets = useSidekick(useShallow((s) => (s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.widgetIds ?? []).map((id) => s.widgets[id]).filter(Boolean)));
  const s = useSidekick.getState;
  const [pick, setPick] = useState("");
  const move = (i: number, d: -1 | 1) => {
    const next = dock.slice();
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    s().setDock(next);
  };
  const add = () => {
    const [kind, ref] = pick.split(":");
    if (kind === "action") s().addDockItem({ kind: "action", action: ref as DockActionId });
    if (kind === "routine") s().addDockItem({ kind: "routine", routineId: ref });
    if (kind === "favorite") s().addDockItem({ kind: "favorite", favoriteId: ref });
    if (kind === "widget") s().addDockItem({ kind: "widget", widgetId: ref });
    setPick("");
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Pin one-tap actions, routines, favorites and widgets. Change the dock position in General.</p>
      <ul className="space-y-1">
        {dock.map((item, i) => {
          const info = dockItemInfo(item);
          return (
            <li key={item.id} className="flex items-center gap-1.5 rounded-xl border-2 border-line p-1">
              <span className="w-8 text-center text-xl" aria-hidden>{info.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{info.label}</span>
              <span className="text-[10px] font-black uppercase text-ink-soft">{item.kind}</span>
              <IconButton label={`Move ${info.label} earlier`} disabled={i === 0} onClick={() => move(i, -1)} className="h-9 w-9"><ArrowUp size={16} /></IconButton>
              <IconButton label={`Move ${info.label} later`} disabled={i === dock.length - 1} onClick={() => move(i, 1)} className="h-9 w-9"><ArrowDown size={16} /></IconButton>
              <IconButton label={`Unpin ${info.label}`} onClick={() => s().removeDockItem(item.id)} className="h-9 w-9"><X size={16} /></IconButton>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-1.5">
        <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Item to pin">
          <option value="">Choose something to pin…</option>
          <optgroup label="Actions">
            {(Object.keys(DOCK_ACTIONS) as DockActionId[]).map((a) => (
              <option key={a} value={`action:${a}`}>{DOCK_ACTIONS[a].emoji} {DOCK_ACTIONS[a].label}</option>
            ))}
          </optgroup>
          {routines.length > 0 && (
            <optgroup label="Quick Routines">
              {routines.map((r) => <option key={r.id} value={`routine:${r.id}`}>{r.icon} {r.name}</option>)}
            </optgroup>
          )}
          {favorites.length > 0 && (
            <optgroup label="Favorites">
              {favorites.map((f) => <option key={f.id} value={`favorite:${f.id}`}>{DEFINITIONS[f.type].emoji} {f.name}</option>)}
            </optgroup>
          )}
          <optgroup label="Widgets in this workspace">
            {widgets.map((w) => <option key={w.id} value={`widget:${w.id}`}>{DEFINITIONS[w.type].emoji} {w.title || DEFINITIONS[w.type].name}</option>)}
          </optgroup>
        </select>
        <Button variant="primary" disabled={!pick} onClick={add}>Pin</Button>
      </div>
    </div>
  );
}

function DataTab() {
  const prefs = useSidekick((s) => s.prefs);
  const sync = useSidekick((s) => s.sync);
  const s = useSidekick.getState;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmEl, ask] = useConfirm();
  const [msg, setMsg] = useState<string | null>(null);

  const exportPack = () => {
    const pack = buildSettingsPack(persistedSnapshot());
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sidekick-pack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("Exported. The file contains layouts and settings only — no student names or records.");
  };

  const importPack = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error("That file is too large.");
      const data = importSettingsPack(JSON.parse(await file.text()));
      useSidekick.setState((st) => ({
        workspaces: [...st.workspaces, ...data.workspaces],
        widgets: { ...st.widgets, ...data.widgets },
        favorites: [...st.favorites, ...data.favorites],
        routines: [...st.routines, ...data.routines],
      }));
      setMsg(`Imported ${data.workspaces.length} workspace(s), ${data.favorites.length} favorite(s), ${data.routines.length} routine(s). Your classes were not changed.`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-5">
      {confirmEl}
      {msg && <p role="status" className="rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold dark:bg-white/10">{msg}</p>}
      <section className="space-y-2">
        <h3 className="font-extrabold">Where your data lives</h3>
        <p className="text-sm text-ink-soft">
          Everything is saved automatically in this browser on this device. No account is needed and nothing is sent to a server. Microphone audio is analysed live and never recorded.
        </p>
        <Toggle
          checked={prefs.studentDataRetention === "keep"}
          onChange={(v) => s().setPrefs({ studentDataRetention: v ? "keep" : "session" })}
          label="Save student names & class records on this device"
          description="Off: rosters, points and participation are kept only until this tab closes."
        />
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (await ask("Delete all student names, groups, points, participation and picks from every class? Class names, widgets and settings stay.", "Delete student data")) {
              s().clearAllStudentData();
              setMsg("All student data was deleted.");
            }
          }}
        >
          <Trash2 size={14} /> Delete all student data
        </Button>
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold">Share or back up settings</h3>
        <p className="text-sm text-ink-soft">Packs include workspaces, widget settings, favorites, routines and theme. Student names, records, note text and pictures are never included.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportPack}><Download size={16} /> Export settings pack</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import pack…</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Settings pack file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importPack(f); }} />
        </div>
      </section>
      <section className="space-y-1">
        <h3 className="font-extrabold">Cross-device sync (not active yet)</h3>
        <p className="text-sm text-ink-soft">Choose what you would like to sync once sign-in is available. Nothing syncs today. Class records will only sync after secure, school-approved storage exists.</p>
        <Toggle checked={sync.themes} onChange={(themes) => s().setSync({ themes })} label="Themes" />
        <Toggle checked={sync.layouts} onChange={(layouts) => s().setSync({ layouts })} label="Widget layouts" />
        <Toggle checked={sync.presets} onChange={(presets) => s().setSync({ presets })} label="Workspace presets" />
        <Toggle checked={sync.favorites} onChange={(favorites) => s().setSync({ favorites })} label="Favorites" />
        <Toggle checked={sync.notes} onChange={(notes) => s().setSync({ notes })} label="Notes" />
        <p className="text-xs text-ink-soft">🔒 Class records: always off until approved.</p>
      </section>
    </div>
  );
}
