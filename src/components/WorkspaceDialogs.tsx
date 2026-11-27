"use client";
/**
 * Dialogs for the two header dropdowns:
 *  - ClassSwitchDialog: after picking a class, keep / load its last workspace / choose another.
 *  - NewWorkspaceDialog: template, duplicate, or blank (CHAMPS + Voice Level are always added).
 */
import { useEffect, useState } from "react";
import { useSidekick } from "@/store/store";
import { useSelectValue } from "@/store/hooks";
import { WORKSPACE_TEMPLATES, isShared, sharedIdOf, type NewWorkspaceChoice, type WorkspaceTemplate } from "@/store/workspaceLogic";
import { DEFINITIONS } from "@/widgets/definitions";
import { Button, Modal, cx, inputCls } from "./ui";

const useSharedWorkspaces = () =>
  useSelectValue((st) => st.workspaces.filter(isShared).map((w) => ({ id: w.id, name: w.name })));

export function ClassSwitchDialog() {
  const prompt = useSidekick((s) => s.classSwitchPrompt);
  const className = useSidekick((s) => s.classes.find((c) => c.id === prompt?.classId)?.name ?? "");
  const currentShared = useSidekick((s) => sharedIdOf(s, s.activeWorkspaceId));
  const workspaces = useSharedWorkspaces();
  const [choosing, setChoosing] = useState(false);
  const [pick, setPick] = useState("");
  const s = useSidekick.getState;
  useEffect(() => {
    setChoosing(false);
    setPick("");
  }, [prompt]);
  if (!prompt) return null;
  const close = () => s().closeClassSwitchPrompt();
  const current = workspaces.find((w) => w.id === currentShared);
  const last = workspaces.find((w) => w.id === prompt.lastWorkspaceId && w.id !== currentShared);
  const go = (id: string) => {
    s().setActiveWorkspace(id);
    close();
  };
  return (
    <Modal open onClose={close} title={`Now teaching ${className}`}>
      <div className="space-y-2" data-testid="class-switch-dialog">
        <p className="text-sm text-ink-soft">Roster and class data are loaded. Which teaching workspace?</p>
        <Button variant="primary" className="w-full justify-start" onClick={() => go(currentShared)}>
          Keep Current Workspace{current ? ` (${current.name})` : ""}
        </Button>
        <Button variant="outline" className="w-full justify-start" disabled={!last} onClick={() => last && go(last.id)}>
          {last ? `Load This Class's Last-Used Workspace (${last.name})` : "Load This Class's Last-Used Workspace (same as current)"}
        </Button>
        {!choosing ? (
          <Button variant="outline" className="w-full justify-start" onClick={() => setChoosing(true)}>
            Choose Another Workspace…
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <select className={inputCls} aria-label="Choose a workspace" value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
              <option value="">Choose a workspace…</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button variant="primary" disabled={!pick} onClick={() => go(pick)}>
              Open
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

type Mode = "template" | "duplicate" | "blank";

export function NewWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const workspaces = useSharedWorkspaces();
  const activeShared = useSidekick((s) => sharedIdOf(s, s.activeWorkspaceId));
  const [mode, setMode] = useState<Mode>("template");
  const [kind, setKind] = useState<WorkspaceTemplate["kind"]>("wholeGroup");
  const [fromId, setFromId] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("template");
    setKind("wholeGroup");
    setFromId(activeShared);
    setName("Whole Group");
    setNameTouched(false);
  }, [open, activeShared]);

  // Suggest a name until the teacher types their own.
  useEffect(() => {
    if (nameTouched) return;
    if (mode === "template") setName(WORKSPACE_TEMPLATES.find((t) => t.kind === kind)!.name);
    else if (mode === "duplicate") setName(`${workspaces.find((w) => w.id === fromId)?.name ?? "Workspace"} copy`);
    else setName("New workspace");
  }, [mode, kind, fromId, nameTouched, workspaces]);

  const create = () => {
    const choice: NewWorkspaceChoice =
      mode === "template" ? { mode, kind, name } : mode === "duplicate" ? { mode, fromId, name } : { mode, name };
    useSidekick.getState().createWorkspace(choice);
    onClose();
  };
  const tabs: { value: Mode; label: string }[] = [
    { value: "template", label: "Use a template" },
    { value: "duplicate", label: "Duplicate" },
    { value: "blank", label: "Start blank" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New teaching workspace"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create} disabled={!name.trim() || (mode === "duplicate" && !fromId)}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-3" data-testid="new-workspace-dialog">
        <div role="radiogroup" aria-label="How to start" className="grid grid-cols-3 gap-1 rounded-xl bg-soft p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={mode === t.value}
              onClick={() => setMode(t.value)}
              className={cx("min-h-9 rounded-lg px-1 text-xs font-extrabold sm:text-sm", mode === t.value ? "bg-card shadow-sm" : "text-ink-soft")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "template" && (
          <div role="radiogroup" aria-label="Template" className="grid gap-1.5 sm:grid-cols-2">
            {WORKSPACE_TEMPLATES.map((t) => (
              <button
                key={t.kind}
                type="button"
                role="radio"
                aria-checked={kind === t.kind}
                onClick={() => setKind(t.kind)}
                className={cx("rounded-xl border-2 px-2.5 py-2 text-left", kind === t.kind ? "border-brand bg-soft" : "border-line hover:bg-soft")}
              >
                <span className="block text-sm font-extrabold">
                  {t.emoji} {t.name}
                </span>
                <span className="block text-xs text-ink-soft">{t.widgets.map((w) => (w.config?.stations ? "Station Timer" : DEFINITIONS[w.type].name)).join(" · ")}</span>
              </button>
            ))}
          </div>
        )}

        {mode === "duplicate" && (
          <label className="block space-y-1">
            <span className="text-sm font-bold">Copy widgets, layout and settings from</span>
            <select className={inputCls} value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <span className="block text-xs text-ink-soft">Student tracking records are never copied.</span>
          </label>
        )}

        {mode === "blank" && <p className="text-sm text-ink-soft">Starts with just the required Expectations and Voice Level widgets. Add the rest from the Widget Library.</p>}

        <label className="block space-y-1">
          <span className="text-sm font-bold">Workspace name</span>
          <input
            className={inputCls}
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
