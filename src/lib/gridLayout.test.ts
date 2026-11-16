import { describe, expect, it } from "vitest";
import { buildLayout, insertAt, readingOrder, type GridItem } from "./gridLayout";

// Two columns of 1-wide widgets: champs (tall) in col 0; clock then dice in col 1.
const base: GridItem[] = [
  { i: "champs", x: 0, y: 0, w: 1, h: 100 },
  { i: "clock", x: 1, y: 0, w: 1, h: 40 },
  { i: "dice", x: 1, y: 40, w: 1, h: 30 },
  { i: "notes", x: 2, y: 0, w: 1, h: 50 },
];
const pos = (l: GridItem[], i: string) => l.find((x) => x.i === i)!;

describe("insertAt", () => {
  it("drops below a widget when the pointer is over its bottom half", () => {
    const out = insertAt(base, "notes", 1, 75); // over dice's bottom half
    expect(pos(out, "notes")).toMatchObject({ x: 1, y: 70 });
    expect(pos(out, "clock").y).toBe(0);
    expect(pos(out, "dice").y).toBe(40);
  });

  it("drops above a widget when the pointer is over its top half", () => {
    const out = insertAt(base, "notes", 1, 5);
    expect(pos(out, "notes")).toMatchObject({ x: 1, y: 0 });
    expect(pos(out, "clock").y).toBe(50);
    expect(pos(out, "dice").y).toBe(90);
  });

  it("stacks under the last widget when dropped in empty space, packing upward", () => {
    const out = insertAt(base, "dice", 2, 500);
    expect(pos(out, "dice")).toMatchObject({ x: 2, y: 50 });
  });

  it("does not depend on the path: same result from any starting layout", () => {
    const shuffled = insertAt(insertAt(base, "notes", 1, 5), "notes", 2, 0);
    expect(insertAt(shuffled, "notes", 1, 75)).toEqual(insertAt(base, "notes", 1, 75));
  });

  it("keeps locked widgets in place", () => {
    const locked = base.map((l) => (l.i === "clock" ? { ...l, static: true } : l));
    const out = insertAt(locked, "notes", 1, 5);
    expect(pos(out, "clock").y).toBe(0);
    expect(pos(out, "notes").y).toBe(40); // can't go above the locked clock, so it goes right under it
    expect(pos(out, "dice").y).toBe(90);
  });
});

describe("buildLayout / readingOrder", () => {
  it("places new widgets in the lowest column and orders top-left first", () => {
    const l = buildLayout(["a", "b", "c"], undefined, () => 1, (id) => (id === "a" ? 50 : 10), 2);
    expect(pos(l, "c")).toMatchObject({ x: 1, y: 10 });
    expect(readingOrder(l)).toEqual(["a", "b", "c"]);
  });
});
