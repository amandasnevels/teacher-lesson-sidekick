/**
 * Debounced autosave to IndexedDB. Pausable: when Sidekick is opened in another window, this window
 * stops writing so the two windows can't overwrite each other's changes.
 */
import { persistedSnapshot, useSidekick } from "./store";
import { saveState } from "./persist";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let paused = false;

export async function flush() {
  if (!dirty || paused) return;
  dirty = false;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await saveState(persistedSnapshot());
  } catch (e) {
    useSidekick.getState().toast({ message: `Couldn't save changes: ${(e as Error).message}`, tone: "warn" });
  }
}

export function markDirty() {
  if (paused) return;
  dirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), 300);
}

export function pauseSaving() {
  paused = true;
  dirty = false;
  if (saveTimer) clearTimeout(saveTimer);
}
