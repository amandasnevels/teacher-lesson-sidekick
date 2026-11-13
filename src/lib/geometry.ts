/**
 * Pure animation geometry for the dice, spinner and coin.
 * The widgets choose a result FIRST, then compute the final transform from it with these
 * functions. Tests verify the inverse functions (what is visible for a transform) agree.
 *
 * Conventions follow CSS transforms: y points down, +z points toward the viewer,
 * `transform: rotateX(a) rotateY(b)` → M = Rx(a) · Ry(b), and points are transformed as M · p.
 */

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

const rad = (d: number) => (d * Math.PI) / 180;

export function rotX(deg: number): Mat3 {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

export function rotY(deg: number): Mat3 {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ];
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return r;
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/* ------------------------------------------------------------------ DICE */

/** CSS transform applied to each face element inside the cube (opposite faces sum to 7). */
export const DIE_FACE_TRANSFORMS: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  6: { rx: 0, ry: 180 },
  3: { rx: 0, ry: 90 },
  4: { rx: 0, ry: -90 },
  2: { rx: 90, ry: 0 },
  5: { rx: -90, ry: 0 },
};

/** Cube rotation (mod 360) that brings each face to the front. */
const DIE_SHOW_FACE: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  6: { rx: 0, ry: 180 },
  3: { rx: 0, ry: -90 },
  4: { rx: 0, ry: 90 },
  2: { rx: -90, ry: 0 },
  5: { rx: 90, ry: 0 },
};

/** Which face points at the viewer for a cube rotation `rotateX(rx) rotateY(ry)`. */
export function visibleDieFace(rx: number, ry: number): number {
  const cube = mul(rotX(rx), rotY(ry));
  let best = 1;
  let bestZ = -Infinity;
  for (const [face, t] of Object.entries(DIE_FACE_TRANSFORMS)) {
    const local = mul(rotX(t.rx), rotY(t.ry));
    const normal = apply(mul(cube, local), [0, 0, 1]);
    if (normal[2] > bestZ) {
      bestZ = normal[2];
      best = Number(face);
    }
  }
  return best;
}

/** Smallest angle ≥ from + minExtra whose value mod 360 equals base mod 360. */
function forwardTo(from: number, base: number, minExtra: number): number {
  const target = from + minExtra;
  const b = ((base % 360) + 360) % 360;
  const k = Math.ceil((target - b) / 360);
  return b + k * 360;
}

/** Final cube rotation for a roll that lands on `face`, always spinning forward several turns. */
export function dieRotationFor(face: number, current: { rx: number; ry: number }, turns = 2) {
  const show = DIE_SHOW_FACE[face];
  if (!show) throw new Error(`Invalid die face ${face}`);
  return {
    rx: forwardTo(current.rx, show.rx, 360 * turns),
    ry: forwardTo(current.ry, show.ry, 360 * (turns + 1)),
  };
}

/* --------------------------------------------------------------- SPINNER */

/** Segment index under a top-mounted pointer for a wheel rotated clockwise by `rotation` degrees. */
export function segmentAtPointer(rotation: number, count: number): number {
  if (count <= 0) return -1;
  const w = 360 / count;
  const local = (((-rotation) % 360) + 360) % 360; // wheel-local angle now under the pointer
  return Math.min(count - 1, Math.floor(local / w));
}

/**
 * Final wheel rotation that puts segment `index` under the pointer.
 * `jitter` in [-1, 1] offsets the landing inside the segment (kept away from the edges).
 */
export function spinnerRotationFor(index: number, count: number, current: number, turns = 5, jitter = 0): number {
  const w = 360 / count;
  const local = index * w + w / 2 + Math.max(-1, Math.min(1, jitter)) * w * 0.35;
  const base = -local;
  return forwardTo(current, base, 360 * turns);
}

/* ------------------------------------------------------------------ COIN */

export type CoinSide = "heads" | "tails";

/** Heads is the front face; tails is the back face (rotateX(180)). */
export function visibleCoinSide(rotationX: number): CoinSide {
  return Math.cos(rad(rotationX)) >= 0 ? "heads" : "tails";
}

export function coinRotationFor(side: CoinSide, current: number, turns = 4): number {
  return forwardTo(current, side === "heads" ? 0 : 180, 360 * turns);
}
