/** Class points from the Voice Level meter: penalties for the too-loud alarm, rewards for quiet streaks. */
import type { VoiceLevel } from "./types";

/** Voice levels by number (0 = silent … 4 = presentation), as used in CHAMPS conversation levels. */
export const LEVEL_BY_NUMBER: VoiceLevel[] = ["silent", "whisper", "partner", "table", "presentation"];

/**
 * Voice level for a CHAMPS Conversation text like "Level 0–1. Move quietly." A range allows up to
 * its highest number, so "0–1" → whisper. Returns null when the text has no level.
 */
export function voiceLevelForConversation(text: string): VoiceLevel | null {
  const m = /level\s*(\d)(?:\s*[–-]\s*(\d))?/i.exec(text);
  if (!m) return null;
  const n = Math.max(Number(m[1]), m[2] ? Number(m[2]) : 0);
  return LEVEL_BY_NUMBER[Math.min(LEVEL_BY_NUMBER.length - 1, n)];
}

/** Tracks quiet time: rewards once every `minutes` without an alarm, then starts over. */
export class QuietStreak {
  private since: number | null = null;
  start(now: number) {
    this.since = now;
  }
  stop() {
    this.since = null;
  }
  /** The alarm went off: the quiet time starts over. */
  alarm(now: number) {
    if (this.since != null) this.since = now;
  }
  /** Milliseconds until the next reward (null when not running). */
  remaining(now: number, minutes: number): number | null {
    return this.since == null ? null : Math.max(0, this.since + minutes * 60000 - now);
  }
  /** True when a reward is due; the streak then starts over. */
  tick(now: number, minutes: number): boolean {
    if (this.since == null || minutes <= 0) return false;
    if (now - this.since >= minutes * 60000) {
      this.since = now;
      return true;
    }
    return false;
  }
}
