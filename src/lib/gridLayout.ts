/**
 * 2D widget layout helpers (used with react-grid-layout).
 * Rows are 4px; each widget spans as many rows as its measured height needs, so widgets stack tightly.
 */
import type { LayoutPos } from "./types";

export const ROW_PX = 4;
export const GAP_PX = 12;

/** Grid rows for a card of this height (plus the gap below it). */
export const rowsFor = (px: number) => Math.max(1, Math.ceil((px + GAP_PX) / ROW_PX));

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
}

/**
 * Build the layout for `cols` columns. Saved positions are kept (clamped to fit); widgets without a
 * saved position go into the lowest available spot, which gives a compact default arrangement.
 */
export function buildLayout(
  ids: string[],
  saved: LayoutPos[] | undefined,
  spanOf: (id: string) => number,
  rowsOf: (id: string) => number,
  cols: number,
  lockedOf: (id: string) => boolean = () => false,
): GridItem[] {
  const savedById = new Map((saved ?? []).map((p) => [p.i, p]));
  const heights = new Array(Math.max(1, cols)).fill(0);
  const out: GridItem[] = [];
  const place = (item: GridItem) => {
    for (let c = item.x; c < item.x + item.w; c++) heights[c] = Math.max(heights[c], item.y + item.h);
    out.push(item);
  };
  // Saved items first (in reading order) so new ones fill around them.
  const savedIds = ids.filter((id) => savedById.has(id));
  const newIds = ids.filter((id) => !savedById.has(id));
  for (const id of savedIds) {
    const p = savedById.get(id)!;
    const w = Math.min(Math.max(1, spanOf(id)), cols);
    place({ i: id, x: Math.min(Math.max(0, p.x), cols - w), y: Math.max(0, p.y), w, h: rowsOf(id), static: lockedOf(id) });
  }
  for (const id of newIds) {
    const w = Math.min(Math.max(1, spanOf(id)), cols);
    let bestX = 0;
    let bestY = Infinity;
    for (let x = 0; x + w <= cols; x++) {
      const y = Math.max(...heights.slice(x, x + w));
      if (y < bestY) {
        bestY = y;
        bestX = x;
      }
    }
    place({ i: id, x: bestX, y: bestY, w, h: rowsOf(id), static: lockedOf(id) });
  }
  return out;
}

/** Reading order: top to bottom, then left to right. */
export function readingOrder(layout: { i: string; x: number; y: number }[]): string[] {
  return [...layout].sort((a, b) => a.y - b.y || a.x - b.x).map((l) => l.i);
}

const overlapsX = (a: { x: number; w: number }, b: { x: number; w: number }) => a.x < b.x + b.w && b.x < a.x + a.w;

/**
 * Drop rule for dragging: put widget `id` in column `x`, directly ABOVE the widget whose top half
 * the pointer is over, or BELOW it when the pointer is over its bottom half (or below everything).
 * Everything then packs upward ("gravity"), keeping each column's order. Locked widgets stay put.
 * Unlike react-grid-layout's own collision handling, the result only depends on where you drop,
 * not on the path the pointer took to get there.
 */
export function insertAt(start: GridItem[], id: string, x: number, pointerRow: number): GridItem[] {
  const dragged = start.find((l) => l.i === id);
  if (!dragged) return start;
  const nx = Math.max(0, x);
  const moving = { ...dragged, x: nx };
  const others = start.filter((l) => l.i !== id);
  const inCol = others.filter((l) => overlapsX(l, moving)).sort((a, b) => a.y - b.y);
  const before = inCol.find((l) => pointerRow < l.y + l.h / 2);
  const insertY = before ? before.y : inCol.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  // Ordering key: widgets at/after the insert point in these columns go after the dragged one.
  const keyed = others.map((l) => ({ ...l, k: l.y + (overlapsX(l, moving) && l.y >= insertY ? 0.5 : 0) }));
  keyed.push({ ...moving, y: insertY, k: insertY + 0.25 });
  const statics = keyed.filter((l) => l.static);
  const flowing = keyed.filter((l) => !l.static).sort((a, b) => a.k - b.k || a.x - b.x);
  const placed: GridItem[] = statics.map(({ k: _k, ...l }) => l);
  for (const { k: _k, ...l } of flowing) {
    let y = 0;
    // Lowest spot that doesn't overlap anything already placed in these columns.
    for (;;) {
      const hit = placed.find((p) => overlapsX(p, l) && y < p.y + p.h && p.y < y + l.h);
      if (!hit) break;
      y = hit.y + hit.h;
    }
    placed.push({ ...l, y });
  }
  const order = new Map(start.map((l, n) => [l.i, n]));
  return placed.sort((a, b) => (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0));
}
