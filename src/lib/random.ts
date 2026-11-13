/** Uniform random integer in [0, n). Uses crypto when available. */
export function randomInt(n: number): number {
  if (n <= 0) return 0;
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x: number;
    do {
      c.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Split items into groups of `size`; a short final group is merged so nobody is left alone. */
export function makeGroups<T>(items: readonly T[], size: number): T[][] {
  const s = Math.max(2, Math.floor(size));
  const shuffled = shuffle(items);
  const groups: T[][] = [];
  for (let i = 0; i < shuffled.length; i += s) groups.push(shuffled.slice(i, i + s));
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const [lonely] = groups.pop()!;
    groups[groups.length - 1].push(lonely);
  }
  return groups;
}
