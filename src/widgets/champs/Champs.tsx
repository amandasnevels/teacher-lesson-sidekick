"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useConfig } from "@/store/hooks";
import { Button, Field, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";
import {
  CHAMPS_FIELDS,
  CHAMPS_PRESETS,
  DEFAULT_CHAMPS,
  expectationsFor,
  isPresetId,
  presetName,
  type ChampsConfig,
  type ChampsKey,
  type ChampsPresetId,
} from "./presets";

/** Letter badge colors (white text passes contrast on each). */
const LETTER_COLORS: Record<ChampsKey, string> = { C: "#c2410c", H: "#1d4ed8", A: "#047857", M: "#6d28d9", P: "#be185d", S: "#0f766e" };

function useChamps(id: string) {
  const [config, set] = useConfig<ChampsConfig>(id);
  const active: ChampsPresetId = isPresetId(config?.active) ? config.active : "wholeGroup";
  return { config, set, active, expectations: expectationsFor(config, active) };
}

function Body({ id, view }: WidgetProps) {
  const { config, set, active, expectations } = useChamps(id);
  const expanded = view === "expanded";

  if (expanded) {
    // Projection view: the activity and its six expectations only. No teacher controls.
    return (
      <div className="rounded-3xl bg-white p-3 text-black sm:p-5" data-testid="champs-expanded">
        <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-neutral-700">CHAMPS</p>
        <h3 className="mb-2 text-center text-3xl font-black leading-tight sm:text-4xl" data-testid="champs-active">
          {presetName(active)}
        </h3>
        <ol className="grid gap-2 md:grid-cols-2">
          {CHAMPS_FIELDS.map((f) => (
            <li key={f.key} className="flex items-center gap-3 rounded-2xl border-4 border-black/10 px-3 py-2" data-testid={`champs-row-${f.key}`}>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl font-black text-white sm:h-16 sm:w-16 sm:text-5xl" style={{ background: LETTER_COLORS[f.key] }} aria-hidden>
                {f.key}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black uppercase tracking-wide text-neutral-700">{f.label}</span>
                <span className="block text-2xl font-bold leading-tight">{expectations[f.key]}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="CHAMPS activity">
        {CHAMPS_PRESETS.map((p) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ active: p.id, presets: config?.presets ?? DEFAULT_CHAMPS })}
              className={cx(
                "min-h-10 rounded-xl px-2 text-left text-xs font-bold leading-tight transition",
                on ? "bg-accent text-on-accent shadow-md ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--card)]" : "bg-soft hover:brightness-95",
              )}
            >
              {on && <span aria-hidden>✓ </span>}
              {p.name}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        <p className="mb-1.5 text-center text-sm font-black" data-testid="champs-active">
          {presetName(active)}
        </p>
        <ol className="space-y-1.5">
          {CHAMPS_FIELDS.map((f) => (
            <li key={f.key} className="flex items-start gap-2 rounded-xl bg-soft px-2 py-1.5" data-testid={`champs-row-${f.key}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white" style={{ background: LETTER_COLORS[f.key] }} aria-hidden>
                {f.key}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block text-[11px] font-black uppercase tracking-wide text-ink-soft">{f.label}</span>
                <span className="block font-semibold leading-snug">{expectations[f.key]}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const { active } = useChamps(id);
  return <span className="max-w-28 truncate text-xs font-bold">{presetName(active)}</span>;
}

/** Edit any preset's six fields. Editing never changes which activity is displayed. */
function Settings({ id }: { id: string }) {
  const { config, set, active } = useChamps(id);
  const [editing, setEditing] = useState<ChampsPresetId>(active);
  const values = expectationsFor(config, editing);
  const update = (key: ChampsKey, text: string) =>
    set({ presets: { ...DEFAULT_CHAMPS, ...(config?.presets ?? {}), [editing]: { ...values, [key]: text } } });

  return (
    <div className="space-y-3">
      <Field label="Preset to edit" hint={editing === active ? "This is the activity on display now." : `Displayed activity stays “${presetName(active)}”.`}>
        <select className={inputCls} value={editing} onChange={(e) => setEditing(e.target.value as ChampsPresetId)} aria-label="Preset to edit">
          {CHAMPS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.id === active ? " (displayed)" : ""}
            </option>
          ))}
        </select>
      </Field>
      {CHAMPS_FIELDS.map((f) => (
        <Field key={f.key} label={`${f.key} · ${f.label}`}>
          <textarea
            className={cx(inputCls, "min-h-16 py-2")}
            value={values[f.key]}
            maxLength={160}
            aria-label={`${presetName(editing)} ${f.label}`}
            onChange={(e) => update(f.key, e.target.value)}
          />
        </Field>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => set({ presets: { ...DEFAULT_CHAMPS, ...(config?.presets ?? {}), [editing]: { ...DEFAULT_CHAMPS[editing] } } })}
      >
        <RotateCcw size={14} /> Reset {presetName(editing)} to starter wording
      </Button>
    </div>
  );
}

const ChampsWidget: WidgetModule = { Body, Mini, Settings };
export default ChampsWidget;
