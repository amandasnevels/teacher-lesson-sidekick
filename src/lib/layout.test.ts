import { describe, expect, it } from "vitest";
import { displaySpan, gridColumnsFor, preferredSpan, snapHeight, spanForWidth } from "./layout";

describe("widget sizing", () => {
  it("prefers an explicit width, falling back to the S/M/L preset", () => {
    expect(preferredSpan(null, "S")).toBe(1);
    expect(preferredSpan(undefined, "L")).toBe(3);
    expect(preferredSpan(4, "S")).toBe(4);
    expect(preferredSpan(9, "M")).toBe(4);
  });

  it("clamps the displayed span to the columns that fit, without changing the preference", () => {
    expect(displaySpan(3, 1)).toBe(1);
    expect(displaySpan(3, 5)).toBe(3);
  });

  it("matches the CSS auto-fill column count", () => {
    expect(gridColumnsFor(355, 12)).toBe(1);
    expect(gridColumnsFor(260, 12)).toBe(1); // 280px window
    expect(gridColumnsFor(472, 12)).toBe(2);
    expect(gridColumnsFor(1250, 12)).toBe(5);
  });

  it("snaps dragged widths to whole columns and heights to 8px steps", () => {
    const m = { cols: 5, colWidth: 240, gap: 12 };
    expect(spanForWidth(240, m)).toBe(1);
    expect(spanForWidth(492, m)).toBe(2);
    expect(spanForWidth(600, m)).toBe(2);
    expect(spanForWidth(700, m)).toBe(3);
    expect(spanForWidth(5000, m)).toBe(4); // max 4 columns
    expect(spanForWidth(5000, { ...m, cols: 2 })).toBe(2);
    expect(snapHeight(333)).toBe(336);
    expect(snapHeight(10)).toBe(120);
    expect(snapHeight(99999)).toBe(1600);
  });
});
