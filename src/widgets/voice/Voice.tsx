"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Mic, MicOff } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useConfig } from "@/store/hooks";
import type { SoundId, VoiceLevel } from "@/lib/types";
import { MicMeter, type MicError, type MicState } from "@/lib/micMeter";
import { LoudAlarm } from "@/lib/loudAlarm";
import { QuietStreak } from "@/lib/voicePoints";
import { formatDuration } from "@/lib/time";
import { SOUNDS, isSoundId, playSound } from "@/lib/audio";
import { Button, Field, Modal, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

export const VOICE_LEVELS: Record<VoiceLevel, { label: string; emoji: string; desc: string; yellow: number; red: number; color: string }> = {
  silent: { label: "Silent", emoji: "🤫", desc: "No voices", yellow: 18, red: 32, color: "#5b6779" },
  whisper: { label: "Whisper", emoji: "🐭", desc: "Only your neighbor can hear", yellow: 32, red: 50, color: "#12a594" },
  partner: { label: "Partner", emoji: "👯", desc: "Talk with one partner", yellow: 45, red: 62, color: "#0c8ce9" },
  table: { label: "Table", emoji: "🪑", desc: "Your table group can hear", yellow: 55, red: 72, color: "#8e4ec6" },
  presentation: { label: "Presentation", emoji: "🎤", desc: "The whole room can hear", yellow: 70, red: 86, color: "#f76b15" },
};

interface VoiceConfig {
  level: VoiceLevel;
  sensitivity: number;
  customThresholds: boolean;
  yellow: number;
  red: number;
  /** Play a sound when the room stays too loud. Off unless the teacher turns it on. */
  alertOn?: boolean;
  alertSound?: SoundId;
  /** Seconds the meter must stay red before the alert plays. */
  alertDelay?: number;
  /** Minimum seconds between alerts. */
  alertCooldown?: number;
  /** Use whole-class points with the meter. */
  pointsOn?: boolean;
  /** Take 1 point when the too-loud alarm goes off. */
  deductOnAlarm?: boolean;
  /** Give 1 point after this many quiet minutes without an alarm. */
  rewardOn?: boolean;
  rewardMinutes?: number;
}

export function pointSettings(c: VoiceConfig) {
  const on = !!c.pointsOn;
  return { on, deduct: on && c.deductOnAlarm !== false, reward: on && !!c.rewardOn, minutes: Math.max(1, Math.min(120, Math.round(c.rewardMinutes ?? 5))) };
}

/** Change whole-class points for a specific class (captured at the moment it happened). */
function changeClassPoints(classId: string, delta: number, category: string) {
  useSidekick.getState().addPoints(classId, { kind: "class", id: classId }, delta, category);
}

export function alertSettings(c: VoiceConfig) {
  return {
    on: !!c.alertOn,
    sound: isSoundId(c.alertSound) ? c.alertSound : ("attention" as SoundId),
    delay: c.alertDelay ?? 2,
    cooldown: c.alertCooldown ?? 10,
  };
}

export function thresholdsFor(c: VoiceConfig) {
  const base = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  return c.customThresholds ? { yellow: c.yellow, red: c.red } : { yellow: base.yellow, red: base.red };
}

export function zoneFor(level: number, t: { yellow: number; red: number }): "green" | "yellow" | "red" {
  return level >= t.red ? "red" : level >= t.yellow ? "yellow" : "green";
}

/**
 * One meter per widget instance. A short grace period lets the card move into the expanded view
 * without re-prompting; otherwise the microphone is released as soon as the widget unmounts.
 */
const meters = new Map<string, { meter: MicMeter; refs: number; timer?: ReturnType<typeof setTimeout> }>();
function acquire(id: string): MicMeter {
  let e = meters.get(id);
  if (!e) {
    e = { meter: new MicMeter(), refs: 0 };
    meters.set(id, e);
  }
  if (e.timer) clearTimeout(e.timer);
  e.refs += 1;
  return e.meter;
}
function release(id: string) {
  const e = meters.get(id);
  if (!e) return;
  e.refs -= 1;
  if (e.refs <= 0) {
    e.timer = setTimeout(() => {
      if (e.refs <= 0) {
        e.meter.stop();
        meters.delete(id);
      }
    }, 300);
  }
}

const ZONE_COLORS = { green: "#2bb673", yellow: "#f5b700", red: "#e5484d" };

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<VoiceConfig>(id);
  const meterRef = useRef<MicMeter | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MicState>("off");
  const [error, setError] = useState<MicError | null>(null);
  const [zone, setZone] = useState<"green" | "yellow" | "red">("green");
  const t = thresholdsFor(c);
  const tRef = useRef(t);
  tRef.current = t;
  const lv = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  const big = view === "expanded";
  const alert = alertSettings(c);
  const alertRef = useRef(alert);
  alertRef.current = alert;
  const alarm = useRef(new LoudAlarm({ delayMs: alert.delay * 1000, cooldownMs: alert.cooldown * 1000 }));
  alarm.current.opts = { delayMs: alert.delay * 1000, cooldownMs: alert.cooldown * 1000 };
  const [alerting, setAlerting] = useState(false);
  const muted = useSidekick((s) => s.prefs.muted);
  const points = pointSettings(c);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const streak = useRef(new QuietStreak());
  const [penalty, setPenalty] = useState<{ classId: string; className: string; overridden: boolean } | null>(null);
  const [tally, setTally] = useState({ lost: 0, earned: 0 });
  const [, forceTick] = useState(0);
  const className = useSidekick((s) => s.classes.find((x) => x.id === s.activeClassId)?.name ?? null);

  useEffect(() => {
    if (!alert.on && !points.deduct) alarm.current.reset();
  }, [alert.on, points.deduct]);

  // Quiet-streak rewards: only while the microphone is listening.
  const listening = state === "on";
  useEffect(() => {
    if (!listening || !points.reward) {
      streak.current.stop();
      return;
    }
    streak.current.start(Date.now());
    const t = setInterval(() => {
      const p = pointsRef.current;
      if (streak.current.tick(Date.now(), p.minutes)) {
        const st = useSidekick.getState();
        const cls = st.classes.find((x) => x.id === st.activeClassId);
        if (cls) {
          changeClassPoints(cls.id, 1, "Voice level: quiet streak");
          setTally((x) => ({ ...x, earned: x.earned + 1 }));
          st.toast({
            message: `🎉 Great voices! ${cls.name} earned 1 point`,
            tone: "success",
            actionLabel: "Teacher override",
            onAction: () => changeClassPoints(cls.id, -1, "Voice level: teacher override"),
            timeout: 8000,
          });
        }
      }
      forceTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [listening, points.reward, points.minutes]);

  useEffect(() => {
    const m = acquire(id);
    meterRef.current = m;
    setState(m.state);
    let lastZoneUpdate = 0;
    m.onState = (s, err) => {
      setState(s);
      setError(err ?? null);
    };
    m.onLevel = (level) => {
      const el = barRef.current;
      if (el) {
        const z = zoneFor(level, tRef.current);
        const detecting = alertRef.current.on || pointsRef.current.deduct;
        if (detecting && alarm.current.update(z === "red", Date.now())) {
          if (alertRef.current.on) playSound(alertRef.current.sound);
          setAlerting(true);
          setTimeout(() => setAlerting(false), 2000);
          streak.current.alarm(Date.now());
          if (pointsRef.current.deduct) {
            // Points always go to the class that was selected when the alarm went off.
            const st = useSidekick.getState();
            const cls = st.classes.find((x) => x.id === st.activeClassId);
            if (cls) {
              changeClassPoints(cls.id, -1, "Voice level: too loud");
              setTally((t) => ({ ...t, lost: t.lost + 1 }));
              setPenalty({ classId: cls.id, className: cls.name, overridden: false });
            } else {
              st.toast({ message: "Too loud! (No class selected, so no points changed.)", tone: "warn" });
            }
          }
        }
        el.style.width = `${level}%`;
        el.style.background = ZONE_COLORS[z];
        el.parentElement?.setAttribute("aria-valuenow", String(Math.round(level)));
        const now = performance.now();
        if (now - lastZoneUpdate > 250) {
          lastZoneUpdate = now;
          setZone(z);
        }
      }
    };
    return () => {
      m.onLevel = () => {};
      m.onState = () => {};
      release(id);
    };
  }, [id]);

  useEffect(() => {
    if (meterRef.current) meterRef.current.sensitivity = c.sensitivity;
  }, [c.sensitivity]);

  const on = state === "on";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Voice level expectation">
        {(Object.keys(VOICE_LEVELS) as VoiceLevel[]).map((k, i) => {
          const v = VOICE_LEVELS[k];
          const active = c.level === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${i} ${v.label}`}
              onClick={() => set({ level: k })}
              className={cx("flex min-h-14 flex-col items-center justify-center rounded-xl px-0.5 text-[11px] font-bold leading-tight transition", active ? "scale-105 text-white shadow-md" : "bg-soft text-ink")}
              style={active ? { background: v.color } : undefined}
            >
              <span className="text-xl" aria-hidden>{v.emoji}</span>
              <span className="w-full truncate @max-[290px]:sr-only">{v.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl px-3 py-2 text-center text-white" style={{ background: lv.color }} data-testid="voice-expectation">
        <p className={cx("font-black", big ? "text-6xl" : "text-2xl")}>
          {lv.emoji} {lv.label}
        </p>
        <p className={cx("font-semibold opacity-95", big ? "text-2xl" : "text-sm")}>{lv.desc}</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {on ? (
            <Button variant="danger" size="sm" className="whitespace-nowrap" onClick={() => meterRef.current?.stop()}>
              <MicOff size={16} /> Stop microphone
            </Button>
          ) : (
            <Button variant="accent" size="sm" className="whitespace-nowrap" onClick={() => meterRef.current?.start()} disabled={state === "starting"}>
              <Mic size={16} /> {state === "starting" ? "Waiting for permission…" : "Enable microphone"}
            </Button>
          )}
          <button
            type="button"
            aria-pressed={alert.on}
            onClick={() => set({ alertOn: !alert.on })}
            title={alert.on ? `Plays ${alert.sound} after ${alert.delay}s in the red` : "Play a sound when it stays too loud"}
            className={cx("inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 text-xs font-bold transition", alert.on ? "bg-[#e5484d] text-white" : "bg-soft text-ink")}
            data-testid="loud-alert-toggle"
          >
            {alert.on ? <Bell size={14} /> : <BellOff size={14} />} Too-loud sound: {alert.on ? "On" : "Off"}
          </button>
          {on && (
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-[#d93036]" role="status">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#e5484d]" /> Mic on · not recorded
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-[#ffe5e6] px-3 py-2 text-sm font-semibold text-[#8a1c20]" data-testid="mic-error">
            {error.message}
          </p>
        )}
        <div
          className="relative h-8 overflow-hidden rounded-full bg-line"
          role="meter"
          aria-label="Classroom noise level (relative)"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={on ? `${zone === "green" ? "Good" : zone === "yellow" ? "Getting loud" : "Too loud"} for ${lv.label}` : "Microphone off"}
        >
          <div className="absolute inset-y-0 left-0 bg-[#2bb673]/25" style={{ width: `${t.yellow}%` }} />
          <div className="absolute inset-y-0 bg-[#f5b700]/25" style={{ left: `${t.yellow}%`, width: `${t.red - t.yellow}%` }} />
          <div className="absolute inset-y-0 right-0 bg-[#e5484d]/25" style={{ left: `${t.red}%` }} />
          <div ref={barRef} className="absolute inset-y-1 left-1 rounded-full transition-[width] duration-75" style={{ width: "0%", background: ZONE_COLORS.green }} data-testid="noise-bar" />
          <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${t.yellow}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${t.red}%` }} />
        </div>
        {points.on && (
          <div className="rounded-xl bg-soft px-2 py-1.5 text-xs font-semibold" data-testid="voice-points">
            {className ? (
              <>
                ⭐ Points for <b>{className}</b>
                {(tally.lost > 0 || tally.earned > 0) && <> · this session: <b>+{tally.earned}</b> / <b>−{tally.lost}</b></>}
                {listening && points.reward && (
                  <span className="block text-ink-soft" data-testid="voice-points-next">
                    Next quiet point in {formatDuration(streak.current.remaining(Date.now(), points.minutes) ?? points.minutes * 60000)}
                  </span>
                )}
                {!listening && <span className="block text-ink-soft">Turn the microphone on to track points.</span>}
              </>
            ) : (
              <>⭐ Choose a class to use voice points.</>
            )}
          </div>
        )}
        {penalty && (
          <Modal
            open
            onClose={() => setPenalty(null)}
            title="🔔 Too loud!"
            footer={
              <>
                {!penalty.overridden && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      changeClassPoints(penalty.classId, 1, "Voice level: teacher override");
                      setTally((t) => ({ ...t, lost: Math.max(0, t.lost - 1) }));
                      setPenalty({ ...penalty, overridden: true });
                    }}
                  >
                    Teacher override: give it back
                  </Button>
                )}
                <Button variant="primary" onClick={() => setPenalty(null)} data-autofocus>
                  OK
                </Button>
              </>
            }
          >
            <p className="text-center text-2xl font-black" data-testid="voice-penalty">
              {penalty.overridden ? `Point returned to ${penalty.className}` : `${penalty.className} lost 1 point`}
            </p>
          </Modal>
        )}
        {alert.on && muted && (
          <p className="text-xs font-semibold text-[#8a1c20]">Sounds are muted, so the too-loud alert won’t play. Unmute in Settings.</p>
        )}
        {alerting && (
          <p className="pop-in rounded-xl bg-[#e5484d] px-3 py-1.5 text-center font-black text-white" role="status" data-testid="loud-alert-flash">
            🔔 Too loud!
          </p>
        )}
        {on && (
          <p className={cx("text-center font-black", big ? "text-4xl" : "text-lg")} style={{ color: ZONE_COLORS[zone] === "#f5b700" ? "#a47800" : ZONE_COLORS[zone] }} aria-live="polite">
            {zone === "green" ? "👍 Just right" : zone === "yellow" ? "⚠️ Getting loud" : "🛑 Too loud"}
          </p>
        )}
        <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
          Sensitivity
          <input type="range" min={0.5} max={4} step={0.1} value={c.sensitivity} onChange={(e) => set({ sensitivity: Number(e.target.value) })} className="min-w-0 flex-1 accent-[var(--accent)]" aria-label="Microphone sensitivity" />
        </label>
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<VoiceConfig>(id);
  const v = VOICE_LEVELS[c.level] ?? VOICE_LEVELS.whisper;
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: v.color }}>
      {v.emoji} {v.label}
    </span>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<VoiceConfig>(id);
  const t = thresholdsFor(c);
  const alert = alertSettings(c);
  const points = pointSettings(c);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">The meter shows relative loudness (not calibrated decibels). Audio is analysed on this device and never recorded or sent anywhere.</p>
      <div className="space-y-2 rounded-2xl border-2 border-line p-3">
        <Toggle checked={!!c.pointsOn} onChange={(pointsOn) => set({ pointsOn })} label="Use class points" description="Points go to the class that is selected at that moment. Needs the microphone on." />
        {c.pointsOn && (
          <>
            <Toggle checked={c.deductOnAlarm !== false} onChange={(deductOnAlarm) => set({ deductOnAlarm })} label="Take 1 point when the too-loud alarm goes off" description="A pop-up shows the lost point, with a teacher override." />
            <Toggle checked={!!c.rewardOn} onChange={(rewardOn) => set({ rewardOn })} label="Give 1 point for quiet time" description="When the alarm hasn’t gone off for the time below." />
            {c.rewardOn && (
              <Field label="Quiet time for a point">
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented label="Quiet minutes" value={[1, 2, 5, 10].includes(points.minutes) ? points.minutes : -1} onChange={(v) => v > 0 && set({ rewardMinutes: v })} options={[{ value: 1, label: "1 min" }, { value: 2, label: "2 min" }, { value: 5, label: "5 min" }, { value: 10, label: "10 min" }]} />
                  <label className="flex items-center gap-1 text-sm font-bold">
                    or
                    <input type="number" min={1} max={120} className={cx(inputCls, "min-h-10 w-20")} value={points.minutes} onChange={(e) => set({ rewardMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 1)) })} aria-label="Quiet minutes (any)" />
                    min
                  </label>
                </div>
              </Field>
            )}
          </>
        )}
      </div>
      <div className="space-y-2 rounded-2xl border-2 border-line p-3">
        <Toggle checked={alert.on} onChange={(alertOn) => set({ alertOn })} label="Too-loud sound alert" description="Plays a sound when the meter stays in the red. Needs the microphone on." />
        {alert.on && (
          <>
            <Field label="Alert sound">
              <div className="flex gap-2">
                <select className={inputCls} value={alert.sound} onChange={(e) => set({ alertSound: e.target.value as SoundId })} aria-label="Alert sound">
                  {SOUNDS.map((x) => (
                    <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => playSound(alert.sound)}>Test</Button>
              </div>
            </Field>
            <Field label="Play after it stays loud for">
              <Segmented label="Alert delay" value={alert.delay} onChange={(alertDelay) => set({ alertDelay })} options={[1, 2, 3, 5].map((n) => ({ value: n, label: `${n} s` }))} />
            </Field>
            <Field label="Wait between alerts">
              <Segmented label="Alert cooldown" value={alert.cooldown} onChange={(alertCooldown) => set({ alertCooldown })} options={[5, 10, 20, 30].map((n) => ({ value: n, label: `${n} s` }))} />
            </Field>
          </>
        )}
      </div>
      <Toggle checked={c.customThresholds} onChange={(customThresholds) => set({ customThresholds, yellow: t.yellow, red: t.red })} label="Custom thresholds" description="Otherwise thresholds follow the selected voice level." />
      {c.customThresholds && (
        <>
          <Field label={`Yellow starts at ${c.yellow}`}>
            <input type="range" min={5} max={95} value={c.yellow} onChange={(e) => set({ yellow: Math.min(Number(e.target.value), c.red - 5) })} className="w-full" />
          </Field>
          <Field label={`Red starts at ${c.red}`}>
            <input type="range" min={10} max={100} value={c.red} onChange={(e) => set({ red: Math.max(Number(e.target.value), c.yellow + 5) })} className="w-full" />
          </Field>
        </>
      )}
    </div>
  );
}

const VoiceWidget: WidgetModule = { Body, Mini, Settings };
export default VoiceWidget;
