"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useConfig } from "@/store/hooks";
import { Button, Field, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";
import {
  CHAMPS_FIELDS,
  CHAMPS_PRESETS,
  DEFAULT_CHAMPS,
  ICON_CHOICES,
  captionsFor,
  expectationsFor,
  iconsFor,
  isPresetId,
  presetName,
  type ChampsConfig,
  type ChampsKey,
  type ChampsPresetId,
} from "./presets";
import { ChampsCard } from "./ChampsTile";

/** Letter badge colors (white text passes contrast on each). */
const LETTER_COLORS: Record<ChampsKey, string> = { C: "#c2410c", H: "#1d4ed8", A: "#047857", M: "#6d28d9", P: "#be185d", S: "#0f766e" };

function useChamps(id: string) {
  const [config, set] = useConfig<ChampsConfig>(id);
  const active: ChampsPresetId = isPresetId(config?.active) ? config.active : "wholeGroup";
  return { config, set, active, expectations: expectationsFor(config, active), icons: iconsFor(config, active), captions: captionsFor(config, active) };
}

function Body({ id, view }: WidgetProps) {
  const { config, set, active, expectations, icons, captions } = useChamps(id);
  const expanded = view === "expanded";
  const cards = (big: boolean) => (
    <>
      <ChampsCard preset={active} letter="preset" label={presetName(active)} active big={big} testId="champs-active-card" />
      {CHAMPS_FIELDS.map((f) => (
        <ChampsCard
          key={f.key}
          preset={active}
          letter={f.key}
          label={f.label}
          caption={captions[f.key]}
          details={expectations[f.key]}
          icon={icons[f.key]}
          big={big}
          showDetails={big || !!config?.showWords}
          testId={`champs-row-${f.key}`}
        />
      ))}
    </>
  );

  if (expanded) {
    // Projection view: the activity card plus the six expectation cards. No teacher controls.
    return (
      <div className="rounded-3xl bg-white p-2 text-black sm:p-3" data-testid="champs-expanded">
        <h3 className="sr-only" data-testid="champs-active">{presetName(active)}</h3>
        <ol className="mx-auto grid max-w-[1000px] grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">{cards(true)}</ol>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">CHAMPS activity</span>
        <select
          className={cx(inputCls, "min-h-10 font-black")}
          value={active}
          onChange={(e) => set({ active: e.target.value as ChampsPresetId, presets: config?.presets ?? DEFAULT_CHAMPS })}
          aria-label="CHAMPS activity"
          data-testid="champs-select"
        >
          {CHAMPS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="sr-only" data-testid="champs-active" aria-live="polite">
        {presetName(active)}
      </p>
      <ol className="grid grid-cols-2 gap-2 [&>li:last-child]:col-span-2 [&>li:last-child]:mx-auto [&>li:last-child]:w-[calc(50%-0.25rem)]" aria-label={`${presetName(active)} expectations`}>
        {cards(false)}
      </ol>
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
  const icons = iconsFor(config, editing);
  const captions = captionsFor(config, editing);
  const setCaption = (key: ChampsKey, text: string) =>
    set({ captions: { ...(config?.captions ?? {}), [editing]: { ...(config?.captions?.[editing] ?? {}), [key]: text } } });
  const setIcon = (key: ChampsKey, icon: string) =>
    set({ icons: { ...(config?.icons ?? {}), [editing]: { ...(config?.icons?.[editing] ?? {}), [key]: icon } } });
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
      <Toggle checked={!!config?.showWords} onChange={(showWords) => set({ showWords })} label="Show details under the cards" description="In the small view. Expand always shows them." />
      {CHAMPS_FIELDS.map((f) => (
        <Field key={f.key} label={`${f.key} · ${f.label}`}>
          <select
            className={cx(inputCls, "mb-1 min-h-10")}
            value={icons[f.key]}
            onChange={(e) => setIcon(f.key, e.target.value)}
            aria-label={`${presetName(editing)} ${f.label} icon`}
          >
            {ICON_CHOICES.map((ic) => (
              <option key={ic} value={ic}>
                {ic === "picture" ? "Card picture" : ic === "level" ? "Voice level number (from the details)" : ic}
              </option>
            ))}
          </select>
          <input
            className={cx(inputCls, "mb-1 min-h-10")}
            value={captions[f.key]}
            maxLength={40}
            placeholder="Card caption"
            aria-label={`${presetName(editing)} ${f.label} caption`}
            onChange={(e) => setCaption(f.key, e.target.value)}
          />
          <textarea
            placeholder="Details"
            className={cx(inputCls, "min-h-16 py-2")}
            value={values[f.key]}
            maxLength={160}
            aria-label={`${presetName(editing)} ${f.label} details`}
            onChange={(e) => update(f.key, e.target.value)}
          />
        </Field>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const { [editing]: _drop, ...otherIcons } = config?.icons ?? {};
          const { [editing]: _drop2, ...otherCaptions } = config?.captions ?? {};
          set({ presets: { ...DEFAULT_CHAMPS, ...(config?.presets ?? {}), [editing]: { ...DEFAULT_CHAMPS[editing] } }, icons: otherIcons, captions: otherCaptions });
        }}
      >
        <RotateCcw size={14} /> Reset {presetName(editing)} to starter cards
      </Button>
    </div>
  );
}

const ChampsWidget: WidgetModule = { Body, Mini, Settings };
export default ChampsWidget;
