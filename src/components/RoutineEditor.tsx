"use client";
import { useEffect, useState } from "react";
import { isShared, sharedIdOf } from "@/store/workspaceLogic";
import { useSelectValue } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { describeAction, routineFromCurrentSetup } from "@/store/actions";
import { starterRoutines } from "@/store/defaults";
import { uid } from "@/lib/ids";
import { SOUNDS } from "@/lib/audio";
import { COLOR_KEYS, WIDGET_COLORS } from "@/lib/colors";
import type { QuickRoutine, RoutineAction, SoundId, TemporaryWidgetType, VoiceLevel, WidgetType } from "@/lib/types";
import { ALL_TYPES, DEFINITIONS } from "@/widgets/definitions";
import { VOICE_LEVELS } from "@/widgets/voice/Voice";
import { Button, Field, Modal, cx, inputCls } from "./ui";

type Kind = RoutineAction["kind"];

/** Editor state: at most one action of each kind, executed in this fixed, predictable order. */
const ORDER: Kind[] = ["switchWorkspace", "playSound", "setStatus", "setVoiceLevel", "startTimer", "openChecklist", "showWidget", "hideWidget", "resetWidget"];
const LABELS: Record<Kind, string> = {
  switchWorkspace: "Switch workspace",
  playSound: "Play a sound",
  setStatus: "Set class status",
  setVoiceLevel: "Set voice level",
  startTimer: "Start a timer",
  openChecklist: "Open a checklist",
  showWidget: "Show a widget",
  hideWidget: "Collapse a widget",
  resetWidget: "Reset a temporary widget",
};
const TEMP_TYPES: TemporaryWidgetType[] = ["timer", "tally", "choice", "queue", "dice", "coin", "spinner"];

type Draft = Partial<Record<Kind, RoutineAction>>;

function defaults(wsId: string): Record<Kind, RoutineAction> {
  return {
    switchWorkspace: { kind: "switchWorkspace", workspaceId: wsId },
    playSound: { kind: "playSound", sound: "chime" },
    setStatus: { kind: "setStatus", status: "Independent Work" },
    setVoiceLevel: { kind: "setVoiceLevel", level: "whisper" },
    startTimer: { kind: "startTimer", minutes: 5 },
    openChecklist: { kind: "openChecklist", title: "Cleanup", items: ["Supplies away", "Chairs pushed in"] },
    showWidget: { kind: "showWidget", widgetType: "timer" },
    hideWidget: { kind: "hideWidget", widgetType: "notes" },
    resetWidget: { kind: "resetWidget", widgetType: "tally" },
  };
}

const toDraft = (actions: RoutineAction[]): Draft => Object.fromEntries(actions.map((a) => [a.kind, a]));
export const fromDraft = (d: Draft): RoutineAction[] => ORDER.filter((k) => d[k]).map((k) => d[k]!);

export function RoutineEditor() {
  const { open, routineId, mode } = useSidekick((s) => s.routineEditor);
  const existing = useSidekick((s) => s.routines.find((r) => r.id === routineId));
  const workspaces = useSelectValue((s) => s.workspaces.filter(isShared).map((w) => ({ id: w.id, name: w.name })));
  const activeWs = useSidekick((s) => s.activeWorkspaceId);
  const [stage, setStage] = useState<"template" | "edit">("edit");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("⚡");
  const [color, setColor] = useState("sky");
  const [draft, setDraft] = useState<Draft>({});
  const s = useSidekick.getState;

  const load = (r: Pick<QuickRoutine, "name" | "icon" | "color" | "actions">) => {
    setName(r.name);
    setIcon(r.icon);
    setColor(r.color);
    setDraft(toDraft(r.actions));
    setStage("edit");
  };

  useEffect(() => {
    if (!open) return;
    if (existing) load(existing);
    else if (mode === "template") setStage("template");
    else if (mode === "fromCurrent") load(routineFromCurrentSetup());
    else load({ name: "My routine", icon: "⚡", color: "sky", actions: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId, mode]);

  const close = () => s().closeRoutineEditor();
  const def = defaults(activeWs);
  const actions = fromDraft(draft);
  const upd = (a: RoutineAction) => setDraft((d) => ({ ...d, [a.kind]: a }));

  const save = () => {
    const r: QuickRoutine = { id: existing?.id ?? uid("r"), name: name.trim() || "Routine", icon: icon || "⚡", color, actions };
    s().upsertRoutine(r);
    if (!existing) s().toast({ message: `Saved routine “${r.name}”`, tone: "success", actionLabel: "Pin to dock", onAction: () => s().addDockItem({ kind: "routine", routineId: r.id }) });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={existing ? `Edit ${existing.name}` : "New Quick Routine"}
      footer={
        stage === "edit" ? (
          <>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={actions.length === 0}>Save routine</Button>
          </>
        ) : undefined
      }
    >
      {stage === "template" ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-soft">Choose a ready-made routine, then customize it.</p>
          {starterRoutines().map((r) => (
            <button key={r.name} type="button" onClick={() => load(r)} className="flex w-full items-start gap-3 rounded-2xl border-2 border-line p-3 text-left hover:border-brand">
              <span className="text-3xl" aria-hidden>{r.icon}</span>
              <span>
                <span className="block font-extrabold">{r.name}</span>
                <span className="block text-xs text-ink-soft">{r.actions.map(describeAction).join(" · ")}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[72px_1fr] gap-2">
            <Field label="Icon">
              <input className={cx(inputCls, "text-center text-2xl")} value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} aria-label="Routine icon" />
            </Field>
            <Field label="Name">
              <input className={inputCls} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Routine name" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Routine color">
            {COLOR_KEYS.map((k) => (
              <button key={k} type="button" aria-label={WIDGET_COLORS[k].label} aria-pressed={color === k} onClick={() => setColor(k)} className={cx("h-8 w-8 rounded-full border-4", color === k ? "border-ink" : "border-transparent")} style={{ background: WIDGET_COLORS[k].accent }} />
            ))}
          </div>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs font-bold uppercase text-ink-soft">What happens (in this order)</legend>
            {ORDER.map((k) => {
              const on = !!draft[k];
              const a = draft[k] ?? def[k];
              return (
                <div key={k} className={cx("rounded-xl border-2 p-2", on ? "border-brand" : "border-line")}>
                  <label className="flex min-h-9 cursor-pointer items-center gap-2 font-bold">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--brand)]"
                      checked={on}
                      onChange={(e) => setDraft((d) => {
                        const n = { ...d };
                        if (e.target.checked) n[k] = def[k];
                        else delete n[k];
                        return n;
                      })}
                    />
                    {LABELS[k]}
                  </label>
                  {on && <ActionParams a={a} onChange={upd} workspaces={workspaces} />}
                </div>
              );
            })}
          </fieldset>
          {actions.length > 0 && (
            <p className="text-xs text-ink-soft">
              Preview: {actions.map(describeAction).join(" → ")}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ActionParams({ a, onChange, workspaces }: { a: RoutineAction; onChange: (a: RoutineAction) => void; workspaces: { id: string; name: string }[] }) {
  const sel = cx(inputCls, "mt-1 min-h-10");
  switch (a.kind) {
    case "startTimer":
      return (
        <select className={sel} value={a.minutes} onChange={(e) => onChange({ ...a, minutes: Number(e.target.value) })} aria-label="Timer minutes">
          {[1, 2, 3, 5, 7, 10, 15, 20, 30, 45].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      );
    case "setVoiceLevel":
      return (
        <select className={sel} value={a.level} onChange={(e) => onChange({ ...a, level: e.target.value as VoiceLevel })} aria-label="Voice level">
          {(Object.keys(VOICE_LEVELS) as VoiceLevel[]).map((l) => <option key={l} value={l}>{VOICE_LEVELS[l].emoji} {VOICE_LEVELS[l].label}</option>)}
        </select>
      );
    case "setStatus":
      return <input className={sel} value={a.status} maxLength={30} onChange={(e) => onChange({ ...a, status: e.target.value })} aria-label="Status" />;
    case "playSound":
      return (
        <select className={sel} value={a.sound} onChange={(e) => onChange({ ...a, sound: e.target.value as SoundId })} aria-label="Sound">
          {SOUNDS.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}
        </select>
      );
    case "openChecklist":
      return (
        <div className="space-y-1">
          <input className={sel} value={a.title} maxLength={40} onChange={(e) => onChange({ ...a, title: e.target.value })} aria-label="Checklist title" />
          <textarea className={cx(inputCls, "min-h-20 py-2")} value={a.items.join("\n")} onChange={(e) => onChange({ ...a, items: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} aria-label="Checklist items, one per line" />
          <p className="text-xs text-ink-soft">Opens the checklist with this title, or creates it if it isn’t in the workspace.</p>
        </div>
      );
    case "showWidget":
    case "hideWidget":
      return (
        <select className={sel} value={a.widgetType} onChange={(e) => onChange({ ...a, widgetType: e.target.value as WidgetType })} aria-label="Widget">
          {ALL_TYPES.map((t) => <option key={t} value={t}>{DEFINITIONS[t].emoji} {DEFINITIONS[t].name}</option>)}
        </select>
      );
    case "resetWidget":
      return (
        <select className={sel} value={a.widgetType} onChange={(e) => onChange({ ...a, widgetType: e.target.value as TemporaryWidgetType })} aria-label="Widget to reset">
          {TEMP_TYPES.map((t) => <option key={t} value={t}>{DEFINITIONS[t].emoji} {DEFINITIONS[t].name}</option>)}
        </select>
      );
    case "switchWorkspace":
      return (
        <select className={sel} value={a.workspaceId} onChange={(e) => onChange({ ...a, workspaceId: e.target.value })} aria-label="Workspace">
          {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      );
  }
}
