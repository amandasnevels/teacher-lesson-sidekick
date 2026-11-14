"use client";
import { useEffect, useState } from "react";
import { uid } from "@/lib/ids";

/**
 * Only one Sidekick window should save at a time. The newest window "claims" the app; older
 * windows pause (stop saving and show a notice) so they can't overwrite each other's changes.
 */
export function useSingleWindow(ready: boolean, onPause: () => void): boolean {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!ready || typeof BroadcastChannel === "undefined") return;
    const me = uid("win");
    const ch = new BroadcastChannel("teacher-lesson-sidekick");
    ch.onmessage = (e: MessageEvent<{ type: string; id: string }>) => {
      if (e.data?.type === "claim" && e.data.id !== me) {
        onPause();
        setPaused(true);
      }
    };
    ch.postMessage({ type: "claim", id: me });
    return () => ch.close();
  }, [ready, onPause]);
  return paused;
}
