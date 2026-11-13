import { describe, expect, it } from "vitest";
import { coinRotationFor, dieRotationFor, segmentAtPointer, spinnerRotationFor, visibleCoinSide, visibleDieFace } from "./geometry";

describe("dice geometry", () => {
  it("each face transform at rest shows that face", () => {
    // identity cube rotation shows face 1
    expect(visibleDieFace(0, 0)).toBe(1);
  });

  it("final rotation always shows the rolled face, from any starting rotation", () => {
    let cur = { rx: -20, ry: 25 };
    for (let trial = 0; trial < 300; trial++) {
      const face = 1 + (trial % 6);
      const next = dieRotationFor(face, cur, 2);
      expect(visibleDieFace(next.rx, next.ry)).toBe(face);
      // spins forward at least two full turns on each axis (real animation, not a static swap)
      expect(next.rx - cur.rx).toBeGreaterThanOrEqual(720);
      expect(next.ry - cur.ry).toBeGreaterThanOrEqual(1080);
      cur = next;
    }
  });

  it("rejects invalid faces", () => {
    expect(() => dieRotationFor(7, { rx: 0, ry: 0 })).toThrow();
  });
});

describe("spinner geometry", () => {
  it("lands the chosen segment under the pointer for 2–24 segments", () => {
    let current = 0;
    for (let n = 2; n <= 24; n++) {
      for (let i = 0; i < n; i++) {
        for (const jitter of [-1, -0.5, 0, 0.5, 1]) {
          const r = spinnerRotationFor(i, n, current, 5, jitter);
          expect(segmentAtPointer(r, n)).toBe(i);
          expect(r - current).toBeGreaterThanOrEqual(5 * 360);
          current = r;
        }
      }
    }
  });

  it("maps rotations to segments clockwise from the top", () => {
    // Wheel rotated 0: pointer over the start of segment 0.
    expect(segmentAtPointer(0, 4)).toBe(0);
    // Rotating the wheel clockwise by 10° brings the END of the last segment under the pointer.
    expect(segmentAtPointer(10, 4)).toBe(3);
    expect(segmentAtPointer(-100, 4)).toBe(1);
  });
});

describe("coin geometry", () => {
  it("final rotation shows the flipped side", () => {
    let cur = 0;
    for (let i = 0; i < 100; i++) {
      const side = i % 3 === 0 ? "tails" : "heads";
      const next = coinRotationFor(side, cur, 4);
      expect(visibleCoinSide(next)).toBe(side);
      expect(next - cur).toBeGreaterThanOrEqual(4 * 360);
      cur = next;
    }
  });
});
