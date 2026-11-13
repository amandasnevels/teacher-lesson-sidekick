/**
 * Deterministic Quick Find command parser. No AI, no fuzzy guessing of intent:
 * a fixed grammar of short classroom commands, plus plain-text search handled by the UI.
 */
import type { SoundId } from "./types";

export type ParsedCommand =
  | { kind: "timer"; seconds: number; label: string }
  | { kind: "rollDice"; label: string }
  | { kind: "flipCoin"; label: string }
  | { kind: "pickStudent"; label: string }
  | { kind: "spinWheel"; label: string }
  | { kind: "pickChoice"; label: string }
  | { kind: "playSound"; sound: SoundId; label: string }
  | { kind: "undo"; label: string }
  | { kind: "classPoint"; label: string };

const UNIT_SECONDS: Record<string, number> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function parseCommand(raw: string): ParsedCommand | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;

  // "5 min timer", "timer 5 min", "5m timer", "timer 90 sec", "start 3 minute timer", "timer 5"
  const t =
    /^(?:start |set )?(?:a )?(\d{1,3}(?:\.\d+)?) ?([a-z]+)? ?timer$/.exec(q) ??
    /^(?:start |set )?timer (?:for )?(\d{1,3}(?:\.\d+)?) ?([a-z]+)?$/.exec(q);
  if (t) {
    const n = Number(t[1]);
    const unit = t[2] ?? "min";
    const mult = UNIT_SECONDS[unit];
    if (mult && n > 0) {
      const seconds = Math.round(n * mult);
      if (seconds <= 24 * 3600) {
        const label =
          mult === 60 ? `Start ${plural(n, "minute")} timer` : mult === 1 ? `Start ${plural(n, "second")} timer` : `Start ${plural(n, "hour")} timer`;
        return { kind: "timer", seconds, label };
      }
    }
  }

  if (/^(roll|roll (the |a )?dice|roll (the |a )?die|dice)$/.test(q)) return { kind: "rollDice", label: "Roll the dice" };
  if (/^(flip|flip (a |the )?coin|coin|coin flip|toss (a )?coin)$/.test(q)) return { kind: "flipCoin", label: "Flip a coin" };
  if (/^(pick|pick (a )?(student|name)|random (student|name)|name picker pick)$/.test(q))
    return { kind: "pickStudent", label: "Pick a random student" };
  if (/^(spin|spin (the )?wheel)$/.test(q)) return { kind: "spinWheel", label: "Spin the wheel" };
  if (/^(choose|pick (a )?choice|random choice)$/.test(q)) return { kind: "pickChoice", label: "Pick a random choice" };
  if (/^undo$/.test(q)) return { kind: "undo", label: "Undo last action" };
  if (/^(class point|award class point|\+1 class|point for (the )?class)$/.test(q))
    return { kind: "classPoint", label: "Award a whole-class point" };

  const sound = /^(?:play )?(bell|chime|ding|applause|attention)(?: sound| signal)?$/.exec(q);
  if (sound) {
    const s = sound[1] as SoundId;
    return { kind: "playSound", sound: s, label: `Play ${s} sound` };
  }
  return null;
}
