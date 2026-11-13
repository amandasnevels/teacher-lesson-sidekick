/**
 * Timer state machine. All timing is based on absolute timestamps (endAt), so a timer stays
 * accurate when the tab is throttled, suspended or refreshed.
 */
export type TimerStatus = "idle" | "running" | "paused" | "done";

export interface TimerSession {
  status: TimerStatus;
  durationMs: number;
  endAt: number | null;
  remainingMs: number;
  station: number;
  round: number;
  finishedAt?: number | null;
}

export interface TimerConfig {
  durationSec: number;
  soundOn: boolean;
  sound: string;
  visual: "ring" | "bar" | "none";
  repeat: boolean;
  stations: { enabled: boolean; names: string[] };
}

export function initialSession(config: Pick<TimerConfig, "durationSec">): TimerSession {
  const durationMs = Math.max(1, Math.round(config.durationSec)) * 1000;
  return { status: "idle", durationMs, endAt: null, remainingMs: durationMs, station: 0, round: 1, finishedAt: null };
}

/** The session to display: a missing session is an idle timer at the configured duration. */
export function currentSession(config: TimerConfig, session: TimerSession | undefined): TimerSession {
  if (!session) return initialSession(config);
  if (session.status === "idle") return initialSession(config);
  return session;
}

export function remainingMs(s: TimerSession, now: number): number {
  if (s.status === "running" && s.endAt != null) return Math.max(0, s.endAt - now);
  if (s.status === "done") return 0;
  return s.remainingMs;
}

export function start(s: TimerSession, now: number): TimerSession {
  if (s.status === "running") return s;
  if (s.status === "paused") return { ...s, status: "running", endAt: now + s.remainingMs };
  // idle or done → start from the top
  return { ...s, status: "running", endAt: now + s.durationMs, remainingMs: s.durationMs, station: s.status === "done" ? 0 : s.station, round: s.status === "done" ? 1 : s.round, finishedAt: null };
}

export function pause(s: TimerSession, now: number): TimerSession {
  if (s.status !== "running" || s.endAt == null) return s;
  return { ...s, status: "paused", remainingMs: Math.max(0, s.endAt - now), endAt: null };
}

export function reset(config: TimerConfig): TimerSession {
  return initialSession(config);
}

export function addTime(s: TimerSession, deltaMs: number, now: number): TimerSession {
  if (s.status === "running" && s.endAt != null) {
    const endAt = Math.max(now + 1000, s.endAt + deltaMs);
    return { ...s, endAt };
  }
  if (s.status === "paused" || s.status === "idle") return { ...s, remainingMs: Math.max(1000, s.remainingMs + deltaMs) };
  return s;
}

export type TimerEvent = "station" | "repeat" | "done" | null;

/** Advance a running timer that has reached zero. */
export function advance(s: TimerSession, config: TimerConfig, now: number): { session: TimerSession; event: TimerEvent } {
  if (s.status !== "running" || s.endAt == null || s.endAt > now) return { session: s, event: null };
  const stations = config.stations?.enabled ? config.stations.names.filter((n) => n.trim()) : [];
  if (stations.length > 1 && s.station < stations.length - 1) {
    return { session: { ...s, station: s.station + 1, endAt: now + s.durationMs, remainingMs: s.durationMs }, event: "station" };
  }
  if (config.repeat) {
    return { session: { ...s, station: 0, round: s.round + 1, endAt: now + s.durationMs, remainingMs: s.durationMs }, event: "repeat" };
  }
  return { session: { ...s, status: "done", endAt: null, remainingMs: 0, finishedAt: s.endAt }, event: "done" };
}

/**
 * On app load: a timer that expired while the app was closed is marked done.
 * It is never restarted (even in repeat/station mode) and no sound plays late.
 */
export function onRestore(s: TimerSession | undefined, now: number): TimerSession | undefined {
  if (!s) return s;
  if (s.status === "running" && s.endAt != null && s.endAt <= now) {
    return { ...s, status: "done", endAt: null, remainingMs: 0, finishedAt: s.endAt };
  }
  return s;
}
