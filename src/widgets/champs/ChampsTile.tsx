"use client";
import { cx } from "@/components/ui";
import { artFor, voiceLevelOf, type ChampsKey, type ChampsPresetId } from "./presets";

/** Card colors per letter (border, tinted background), matching the card artwork. */
export const TILE_COLORS: Record<ChampsKey | "preset", { edge: string; tint: string }> = {
  preset: { edge: "#2e2a8f", tint: "#ece6fb" },
  C: { edge: "#1e88e5", tint: "#e3f3fd" },
  H: { edge: "#8e4ec6", tint: "#f1e8fb" },
  A: { edge: "#43b02a", tint: "#ecf8e6" },
  M: { edge: "#f76b15", tint: "#fff0e5" },
  P: { edge: "#e0399b", tint: "#fde8f3" },
  S: { edge: "#14b8a6", tint: "#e2f7f5" },
};

const NAVY = "#14215a";

/** Font size (in container units) that fits a label of this length on one line. */
const fit = (text: string, max: number, k: number) => `${Math.min(max, k / Math.max(1, text.length))}cqi`;

/**
 * One CHAMPS card, laid out like the reference: white label banner on top, artwork in the middle,
 * white caption bar at the bottom, all inside a thick colored rounded border.
 */
export function ChampsCard({
  preset,
  letter,
  label,
  caption,
  details,
  icon = "picture",
  active,
  big,
  showDetails,
  testId,
  wide,
}: {
  /** Full-width card (spans both columns) with a wider, shorter picture area. */
  wide?: boolean;
  preset: ChampsPresetId;
  letter: ChampsKey | "preset";
  label: string;
  caption?: string;
  details?: string;
  icon?: string;
  active?: boolean;
  big?: boolean;
  showDetails?: boolean;
  testId?: string;
}) {
  const c = TILE_COLORS[letter];
  const level = icon === "level" ? voiceLevelOf(details ?? "") : null;
  return (
    <li className={cx("flex min-w-0 flex-col", wide && "col-span-2", big && letter === "preset" && "self-start")} data-testid={testId} title={details ? `${label}: ${details}` : label}>
      <div
        className={cx("relative flex flex-1 flex-col overflow-hidden rounded-[14px] border-[3px] shadow-sm", active && "champs-glow")}
        style={{ borderColor: c.edge, background: c.tint, containerType: "inline-size" }}
      >
        {/* label banner */}
        <div className="mx-[4%] mt-[4%] flex items-center justify-center rounded-full border-2 bg-white px-[4%] py-[2.5%]" style={{ borderColor: `${c.edge}66` }}>
          <span className="whitespace-nowrap font-black uppercase leading-none" style={{ color: NAVY, fontSize: wide ? fit(label, 6, 50) : fit(label, 11, 98), letterSpacing: "-0.01em" }}>
            {label}
          </span>
        </div>
        {/* artwork */}
        <div className={cx("relative flex min-h-0 flex-1 items-center justify-center", letter === "preset" && "mb-[4%] mx-[4%] mt-[3%] overflow-hidden rounded-[10px]")} style={{ aspectRatio: wide ? "6 / 1" : "3 / 1" }} aria-hidden>
          {icon === "picture" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artFor(preset, letter)} alt="" className={cx("h-full w-full", letter === "preset" && !big ? "absolute inset-0 object-cover" : "object-contain")} draggable={false} />
          ) : icon === "level" ? (
            <span className="font-black leading-none" style={{ color: NAVY, fontSize: "24cqi" }}>{level ?? "💬"}</span>
          ) : (
            <span className="leading-none" style={{ fontSize: "22cqi" }}>{icon}</span>
          )}
        </div>
        {/* caption bar */}
        {caption !== undefined && (
          <div className="mx-[4%] mb-[4%] flex min-h-[2.2em] items-center justify-center rounded-full border-2 bg-white px-[4%] py-[2%] text-center" style={{ borderColor: `${c.edge}55`, fontSize: wide ? fit(caption, 4.5, 75) : fit(caption, 8.5, 150) }}>
            <span className="font-extrabold leading-tight" style={{ color: NAVY }} data-testid={testId ? `${testId}-caption` : undefined}>
              {caption}
            </span>
          </div>
        )}
      </div>
      {details && <span className={showDetails ? cx("mt-1 block text-center font-semibold leading-snug", big ? "text-sm xl:text-base" : "text-xs") : "sr-only"}>{details}</span>}
    </li>
  );
}
