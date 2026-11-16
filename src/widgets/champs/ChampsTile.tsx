"use client";
import { cx } from "@/components/ui";
import type { ChampsKey } from "./presets";
import { voiceLevelOf } from "./presets";

/** Card colors per letter: [border, light band, banner outline]. */
export const TILE_COLORS: Record<ChampsKey, { edge: string; band: string }> = {
  C: { edge: "#1e88e5", band: "#bfe6fb" },
  H: { edge: "#8e4ec6", band: "#e4d2f7" },
  A: { edge: "#2bb673", band: "#c9f0dc" },
  M: { edge: "#f76b15", band: "#ffdcc4" },
  P: { edge: "#d6409f", band: "#fbd3ea" },
  S: { edge: "#e2a400", band: "#fff0b3" },
};

const NAVY = "#0f2557";

function Sparkles() {
  // Yellow "shine" strokes around the icon, like a sticker.
  const lines = [
    [5, 36, 15, 42], [3, 56, 14, 56], [5, 76, 15, 70],
    [95, 36, 85, 42], [97, 56, 86, 56], [95, 76, 85, 70],
  ];
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f5c400" strokeWidth="4.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** One CHAMPS picture tile: cloud banner with the label, big icon (or voice-level number), sparkles. */
export function ChampsTile({
  letter,
  label,
  icon,
  text,
  showText,
  big,
}: {
  letter: ChampsKey;
  label: string;
  icon: string;
  text: string;
  showText: boolean;
  big?: boolean;
}) {
  const c = TILE_COLORS[letter];
  const level = icon === "level" ? voiceLevelOf(text) : null;
  const glyph = icon === "level" ? level ?? "💬" : icon;
  const isNumber = icon === "level" && !!level;
  return (
    <li className="flex min-w-0 flex-col" data-testid={`champs-row-${letter}`} title={`${label}: ${text}`}>
      <div
        className="relative overflow-hidden rounded-[18%] border-[3px] bg-white shadow-sm"
        style={{ borderColor: c.edge, containerType: "inline-size", aspectRatio: "1 / 1" }}
      >
        {/* light colored band behind the banner and a wave at the bottom */}
        <div className="absolute inset-x-0 top-0 h-[34%]" style={{ background: c.band }} aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-[16%] rounded-t-[50%]" style={{ background: c.band }} aria-hidden />
        <Sparkles />
        {/* cloud banner */}
        <div className="absolute inset-x-[5%] top-[5%] flex h-[25%] items-center justify-center rounded-full border-2 bg-white px-[4%]" style={{ borderColor: c.edge }}>
          <span className="whitespace-nowrap font-black uppercase leading-none" style={{ color: NAVY, fontSize: `${Math.min(15, 104 / label.length)}cqi`, letterSpacing: "-0.02em" }}>
            {label}
          </span>
        </div>
        {/* icon */}
        <div className="absolute inset-x-0 bottom-[8%] top-[30%] flex items-center justify-center" aria-hidden>
          {isNumber ? (
            <span className="font-black leading-none" style={{ color: NAVY, fontSize: glyph.length > 1 ? "30cqi" : "46cqi", WebkitTextStroke: "0.6cqi white" }}>
              {glyph}
            </span>
          ) : (
            <span className="leading-none" style={{ fontSize: "38cqi" }}>{glyph}</span>
          )}
        </div>
      </div>
      <span className={cx(showText ? "mt-1.5 block font-bold leading-snug" : "sr-only", big ? "text-center text-lg xl:text-xl" : "text-xs")}>{text}</span>
    </li>
  );
}
