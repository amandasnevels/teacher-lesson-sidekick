/** Deep copy. structuredClone is missing on older Chromebooks (Chrome < 98), so fall back to JSON. */
export function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}
