/** Widget sizing on the workspace grid. Pure helpers, shared by the board, the frame and tests. */
import type { WidgetSize } from "./types";

export const MAX_SPAN = 4;
export const MIN_HEIGHT = 120;
export const MAX_HEIGHT = 1600;
export const HEIGHT_STEP = 8;

const SIZE_SPAN: Record<WidgetSize, number> = { S: 1, M: 2, L: 3 };

/** Preferred column span: explicit width wins, else the legacy S/M/L preset. */
export function preferredSpan(w: number | null | undefined, size: WidgetSize | undefined): number {
  const v = w ?? SIZE_SPAN[size ?? "M"] ?? 2;
  return clamp(Math.round(v), 1, MAX_SPAN);
}

/** Span actually displayed: never wider than the columns that fit right now (the preference is kept). */
export function displaySpan(preferred: number, cols: number): number {
  return clamp(preferred, 1, Math.max(1, cols));
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export interface GridMetrics {
  cols: number;
  colWidth: number;
  gap: number;
}

/** Snap a dragged card width (px) to a whole number of grid columns. */
export function spanForWidth(widthPx: number, m: GridMetrics): number {
  const span = Math.round((widthPx + m.gap) / (m.colWidth + m.gap));
  return clamp(span, 1, Math.max(1, Math.min(MAX_SPAN, m.cols)));
}

/** Snap a dragged height (px) to the step grid and allowed range. */
export function snapHeight(px: number): number {
  return clamp(Math.round(px / HEIGHT_STEP) * HEIGHT_STEP, MIN_HEIGHT, MAX_HEIGHT);
}

/** Minimum column width used by the workspace grid CSS (keep in sync with globals.css). */
export const MIN_COLUMN = 230;

/** Number of columns `repeat(auto-fill, minmax(min(100%, 230px), 1fr))` produces for a width. */
export function gridColumnsFor(width: number, gap: number): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.floor((width + gap) / (Math.min(width, MIN_COLUMN) + gap)));
}
