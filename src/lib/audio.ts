/**
 * Original synthesized classroom sounds (Web Audio API). No audio files, no network.
 * A single shared AudioContext; every playing node is tracked so "Stop" silences everything.
 */
import type { SoundId } from "./types";

export const SOUNDS: { id: SoundId; name: string; emoji: string }[] = [
  { id: "bell", name: "Bell", emoji: "🔔" },
  { id: "chime", name: "Chime", emoji: "🎐" },
  { id: "ding", name: "Ding", emoji: "✨" },
  { id: "applause", name: "Applause", emoji: "👏" },
  { id: "attention", name: "Attention", emoji: "📣" },
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const active = new Set<AudioScheduledSourceNode>();
let settings = { volume: 0.7, muted: false };

export function setAudioSettings(volume: number, muted: boolean) {
  settings = { volume: Math.max(0, Math.min(1, volume)), muted };
  if (master && ctx) master.gain.setValueAtTime(settings.muted ? 0 : settings.volume, ctx.currentTime);
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = settings.muted ? 0 : settings.volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function track(node: AudioScheduledSourceNode) {
  active.add(node);
  node.onended = () => active.delete(node);
}

function tone(c: AudioContext, freq: number, start: number, dur: number, peak = 0.35, type: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
  track(osc);
}

function bell(c: AudioContext, t: number) {
  // Inharmonic partials give a bell-like timbre.
  [1, 2.01, 2.76, 4.07, 5.4].forEach((ratio, i) => tone(c, 523.25 * ratio, t, 2.2 - i * 0.3, 0.3 / (i + 1)));
}

function chime(c: AudioContext, t: number) {
  [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(c, f, t + i * 0.16, 1.4, 0.18, "triangle"));
}

function ding(c: AudioContext, t: number) {
  tone(c, 1318.5, t, 0.9, 0.3);
  tone(c, 2637, t, 0.5, 0.08);
}

function attention(c: AudioContext, t: number) {
  [659.25, 880, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.22, 0.45, 0.28, "square"));
}

function applause(c: AudioContext, t: number) {
  // Many short filtered noise bursts at random times approximate clapping.
  const dur = 2.2;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let clap = 0; clap < 90; clap++) {
    const startSample = Math.floor(Math.random() * (data.length - 2000));
    const len = 600 + Math.floor(Math.random() * 900);
    const amp = 0.4 + Math.random() * 0.6;
    for (let i = 0; i < len; i++) data[startSample + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / 180);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(t);
  track(src);
}

const PLAYERS: Record<SoundId, (c: AudioContext, t: number) => void> = { bell, chime, ding, attention, applause };

/** Plays a sound. Returns false when audio is unavailable or muted. */
export function playSound(id: SoundId): boolean {
  if (settings.muted) return false;
  const c = getCtx();
  if (!c || !master) return false;
  PLAYERS[id]?.(c, c.currentTime + 0.02);
  return true;
}

export function stopAllSounds() {
  for (const node of active) {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  }
  active.clear();
}

export function isSoundId(v: unknown): v is SoundId {
  return typeof v === "string" && v in PLAYERS;
}
