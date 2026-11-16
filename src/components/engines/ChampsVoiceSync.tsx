"use client";
import { useEffect } from "react";
import { useSidekick } from "@/store/store";
import { voiceLevelForConversation } from "@/lib/voicePoints";
import { expectationsFor, isPresetId, type ChampsConfig } from "@/widgets/champs/presets";

/**
 * When a CHAMPS widget is tied to the voice meter, choosing an activity sets the Voice Level widgets
 * in the same workspace to that activity's conversation level. It only acts when the CHAMPS level
 * changes, so teachers can still adjust the Voice Level widget by hand afterwards.
 */
const lastApplied = new Map<string, string>();

export function syncChampsVoice() {
  const s = useSidekick.getState();
  const seen = new Set<string>();
  for (const w of Object.values(s.widgets)) {
    if (w.type !== "champs" || w.removedAt) continue;
    const cfg = w.config as unknown as ChampsConfig & { tieVoice?: boolean };
    seen.add(w.id);
    if (!cfg.tieVoice) {
      lastApplied.delete(w.id);
      continue;
    }
    const active = isPresetId(cfg.active) ? cfg.active : "wholeGroup";
    const level = voiceLevelForConversation(expectationsFor(cfg, active).C);
    const key = `${active}|${level}`;
    if (!level || lastApplied.get(w.id) === key) continue;
    lastApplied.set(w.id, key);
    const ws = s.workspaces.find((x) => x.id === w.workspaceId);
    for (const vid of ws?.widgetIds ?? []) {
      const v = s.widgets[vid];
      if (v?.type === "voice" && v.config.level !== level) s.updateConfig(vid, { level });
    }
  }
  for (const id of lastApplied.keys()) if (!seen.has(id)) lastApplied.delete(id);
}

/** Test helper: forget what was applied. */
export function resetChampsVoiceSync() {
  lastApplied.clear();
}

export function ChampsVoiceSync() {
  useEffect(() => {
    syncChampsVoice();
    return useSidekick.subscribe((s, prev) => {
      if (s.widgets !== prev.widgets || s.workspaces !== prev.workspaces) syncChampsVoice();
    });
  }, []);
  return null;
}
