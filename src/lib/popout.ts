/** Opening Sidekick as its own narrow window beside the teacher's slides or website. */
import { flush } from "@/store/autosave";
import { currentSessionId } from "@/store/persist";

export const POPOUT_NAME = "sidekick-popout";
export const POPOUT_WIDTH = 400;

export function isPopoutWindow(): boolean {
  return typeof window !== "undefined" && window.name === POPOUT_NAME;
}

/** Saves, then opens a narrow, full-height window on the right edge. Returns false if the browser blocked it. */
export async function openSidekickWindow(): Promise<boolean> {
  await flush(); // the new window loads from storage, so save first
  const s = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = (s.availLeft ?? 0) + Math.max(0, s.availWidth - POPOUT_WIDTH);
  const top = s.availTop ?? 0;
  const features = `popup=yes,width=${POPOUT_WIDTH},height=${s.availHeight},left=${left},top=${top}`;
  // The new window continues this tab's session (and this window pauses).
  const url = new URL(window.location.href);
  const sid = currentSessionId();
  if (sid) url.searchParams.set("session", sid);
  const w = window.open(url.toString(), POPOUT_NAME, features);
  if (!w) return false;
  w.focus();
  return true;
}
