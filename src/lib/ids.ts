let counter = 0;
/** Short, collision-resistant id. Uses crypto when available. */
export function uid(prefix = "id"): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return `${prefix}_${c.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
