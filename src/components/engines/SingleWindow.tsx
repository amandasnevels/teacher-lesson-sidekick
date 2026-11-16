"use client";
import { useEffect, useState } from "react";
import { uid } from "@/lib/ids";
import { currentSessionId } from "@/store/persist";

/**
 * Only one window per teaching session should save at a time (e.g. after "Open in its own window").
 * Separate tabs have separate sessions and never pause each other. The newest window "claims" the app; older
 * windows pause (stop saving and show a notice) so they can't overwrite each other's changes.
 */
export function useSingleWindow(ready: boolean, onPause: () => void): boolean {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!ready || typeof BroadcastChannel === "undefined") return;
    const me = uid("win");
    const ch = new BroadcastChannel("teacher-lesson-sidekick");
    const sid = currentSessionId();
    ch.onmessage = (e: MessageEvent<{ type: string; id: string; sid: string | null }>) => {
      if (e.data?.type === "claim" && e.data.id !== me && e.data.sid === sid) {
        onPause();
        setPaused(true);
      }
    };
    ch.postMessage({ type: "claim", id: me, sid });
    return () => ch.close();
  }, [ready, onPause]);
  return paused;
}
