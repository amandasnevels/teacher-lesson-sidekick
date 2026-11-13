"use client";
import { useConfig, useNow } from "@/store/hooks";
import { Field, Segmented, Toggle } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface ClockConfig {
  use24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  style: "big" | "compact";
}

function formatTime(d: Date, c: ClockConfig) {
  const h = d.getHours();
  const hh = c.use24h ? String(h).padStart(2, "0") : String(h % 12 === 0 ? 12 : h % 12);
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return { main: `${hh}:${mm}${c.showSeconds ? `:${ss}` : ""}`, suffix: c.use24h ? "" : h < 12 ? "AM" : "PM" };
}

function Body({ id, view }: WidgetProps) {
  const [c] = useConfig<ClockConfig>(id);
  useNow(1000);
  const d = new Date();
  const t = formatTime(d, c);
  const compact = c.style === "compact" && view !== "expanded";
  return (
    <div className="text-center" aria-live="off">
      <p className="big-digits font-black leading-none" style={{ fontSize: view === "expanded" ? "min(18vw, 8rem)" : compact ? "2rem" : "clamp(2.2rem, 16cqi, 3.4rem)" }} data-testid="clock-time">
        {t.main}
        {t.suffix && <span className="ml-1 align-top text-[.4em] font-bold text-ink-soft">{t.suffix}</span>}
      </p>
      {c.showDate && <p className="mt-1 font-semibold text-ink-soft">{d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>}
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<ClockConfig>(id);
  useNow(1000);
  const t = formatTime(new Date(), { ...c, showSeconds: false });
  return <span className="big-digits text-sm font-black">{t.main} {t.suffix}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<ClockConfig>(id);
  return (
    <div className="space-y-2">
      <Toggle checked={c.use24h} onChange={(use24h) => set({ use24h })} label="24-hour time" />
      <Toggle checked={c.showSeconds} onChange={(showSeconds) => set({ showSeconds })} label="Show seconds" />
      <Toggle checked={c.showDate} onChange={(showDate) => set({ showDate })} label="Show date" />
      <Field label="Appearance">
        <Segmented label="Appearance" value={c.style} onChange={(style) => set({ style })} options={[{ value: "big", label: "Big" }, { value: "compact", label: "Compact" }]} />
      </Field>
    </div>
  );
}

const ClockWidget: WidgetModule = { Body, Mini, Settings };
export default ClockWidget;
