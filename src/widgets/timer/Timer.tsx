"use client";
import { useState } from "react";
import { Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useConfig, useNow, useSession } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { formatDuration } from "@/lib/time";
import { SOUNDS, playSound } from "@/lib/audio";
import type { SoundId } from "@/lib/types";
import { Button, Field, IconButton, Segmented, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";
import { addTime, currentSession, pause, remainingMs, reset, start, type TimerConfig, type TimerSession } from "./timerLogic";

const QUICK = [1, 3, 5, 10, 15];

function progressColor(frac: number) {
  if (frac > 0.5) return "#2bb673";
  if (frac > 0.2) return "#f5b700";
  return "#e5484d";
}

function useTimer(id: string) {
  const [config, setConfig] = useConfig<TimerConfig>(id);
  const [raw, setSession] = useSession<TimerSession>(id);
  const session = currentSession(config, raw);
  const running = session.status === "running";
  useNow(200, running); // re-render this timer only, while it runs
  const remaining = remainingMs(session, Date.now());
  const touch = () => useSidekick.getState().setLastTimer(id);
  const toggle = () => {
    touch();
    setSession(running ? pause(session, Date.now()) : start(session, Date.now()));
  };
  const doReset = () => {
    touch();
    setSession(reset(config));
  };
  return { config, setConfig, session, setSession, running, remaining, toggle, doReset, touch };
}

function Body({ id, view }: WidgetProps) {
  const t = useTimer(id);
  const { config, session, running, remaining } = t;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const frac = session.durationMs ? remaining / session.durationMs : 0;
  const color = progressColor(frac);
  const stations = config.stations?.enabled ? config.stations.names.filter((n) => n.trim()) : [];
  const done = session.status === "done";
  const big = view === "expanded";

  const setDuration = (sec: number) => {
    t.touch();
    const durationSec = Math.max(1, Math.min(24 * 3600, Math.round(sec)));
    t.setConfig({ durationSec });
    t.setSession(reset({ ...config, durationSec }));
  };

  const commitDraft = () => {
    setEditing(false);
    const m = /^(\d{1,3})(?::(\d{1,2}))?$/.exec(draft.trim());
    if (m) setDuration(Number(m[1]) * 60 + Number(m[2] ?? 0));
  };

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-3" onPointerDown={t.touch} onFocus={t.touch}>
      {stations.length > 1 && (
        <p className="rounded-xl bg-soft px-3 py-1.5 text-center text-sm font-bold" aria-live="polite">
          Station {session.station + 1} of {stations.length}: {stations[session.station] ?? stations[0]}
        </p>
      )}
      <div className="relative mx-auto flex max-w-[260px] items-center justify-center" style={{ width: "100%", maxWidth: big ? 520 : "clamp(220px, 58cqi, 440px)" }}>
        {config.visual === "ring" && (
          <svg viewBox="0 0 120 120" className="w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ transition: running ? "stroke-dashoffset .2s linear, stroke .5s" : "none" }}
            />
          </svg>
        )}
        <div className={cx("flex flex-col items-center", config.visual === "ring" && "absolute inset-0 justify-center")}>
          {editing ? (
            <input
              autoFocus
              className={cx(inputCls, "w-28 text-center text-2xl font-bold")}
              value={draft}
              inputMode="numeric"
              aria-label="Minutes or mm:ss"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDraft();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <button
              type="button"
              className={cx("big-digits rounded-xl px-2 text-5xl font-black leading-none", done && "animate-pulse text-[#e5484d]")}
              style={{ fontSize: big ? "min(22vw, 9rem)" : "clamp(2.4rem, 14cqi, 5.5rem)" }}
              onClick={() => {
                if (session.status === "idle") {
                  setDraft(String(Math.round(config.durationSec / 60)));
                  setEditing(true);
                }
              }}
              aria-label={session.status === "idle" ? `Duration ${formatDuration(remaining)}. Click to edit` : `Time remaining ${formatDuration(remaining)}`}
              data-testid="timer-display"
            >
              {done ? "0:00" : formatDuration(remaining)}
            </button>
          )}
          <span className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-soft" data-testid="timer-status">
            {done ? "Time’s up!" : session.status === "running" ? (config.repeat ? `Running · round ${session.round}` : "Running") : session.status === "paused" ? "Paused" : "Ready"}
          </span>
        </div>
      </div>
      {config.visual === "bar" && (
        <div className="h-3 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: color, transition: "width .2s linear" }} />
        </div>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="accent" size={big ? "lg" : "md"} className="min-w-28" onClick={t.toggle} aria-label={running ? "Pause timer" : session.status === "paused" ? "Resume timer" : "Start timer"}>
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? "Pause" : session.status === "paused" ? "Resume" : "Start"}
        </Button>
        <IconButton label="Reset timer" variant="outline" onClick={t.doReset}>
          <RotateCcw size={18} />
        </IconButton>
        <IconButton label="Add one minute" variant="outline" onClick={() => t.setSession(addTime(session, 60000, Date.now()))} disabled={done}>
          <Plus size={18} />
        </IconButton>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Quick durations">
        {QUICK.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDuration(m * 60)}
            className={cx(
              "min-h-9 min-w-11 rounded-lg px-2 text-sm font-bold transition",
              config.durationSec === m * 60 ? "bg-accent text-on-accent" : "bg-soft hover:brightness-95",
            )}
          >
            {m}m
          </button>
        ))}
        <button
          type="button"
          className="min-h-9 rounded-lg bg-soft px-2 text-sm font-bold hover:brightness-95"
          onClick={() => {
            setDraft(`${Math.floor(config.durationSec / 60)}:${String(config.durationSec % 60).padStart(2, "0")}`);
            setEditing(true);
          }}
        >
          Custom
        </button>
      </div>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const t = useTimer(id);
  return (
    <span className="flex items-center gap-1">
      <span className={cx("big-digits text-sm font-black", t.session.status === "done" && "text-[#e5484d]")} data-testid="timer-mini">
        {formatDuration(t.remaining)}
      </span>
      <IconButton label={t.running ? "Pause timer" : "Start timer"} size="sm" onClick={t.toggle}>
        {t.running ? <Pause size={16} /> : <Play size={16} />}
      </IconButton>
    </span>
  );
}

function Settings({ id }: { id: string }) {
  const [config, setConfig] = useConfig<TimerConfig>(id);
  const stations = config.stations ?? { enabled: false, names: [] };
  return (
    <div className="space-y-3">
      <Toggle checked={config.soundOn} onChange={(soundOn) => setConfig({ soundOn })} label="Sound when time is up" />
      {config.soundOn && (
        <Field label="End sound">
          <div className="flex gap-2">
            <select className={inputCls} value={config.sound} onChange={(e) => setConfig({ sound: e.target.value })}>
              {SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => playSound(config.sound as SoundId)}>
              Test
            </Button>
          </div>
        </Field>
      )}
      <Field label="Visual countdown">
        <Segmented
          label="Visual countdown"
          value={config.visual}
          onChange={(visual) => setConfig({ visual })}
          options={[
            { value: "ring", label: "Ring" },
            { value: "bar", label: "Bar" },
            { value: "none", label: "Digits only" },
          ]}
        />
      </Field>
      <Toggle checked={config.repeat} onChange={(repeat) => setConfig({ repeat })} label="Repeat" description="Start again automatically when time is up." />
      <Toggle
        checked={stations.enabled}
        onChange={(enabled) => setConfig({ stations: { ...stations, enabled } })}
        label="Station rotation"
        description="Each station gets the full duration, then the next one starts."
      />
      {stations.enabled && (
        <div className="space-y-1.5">
          {stations.names.map((n, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                className={inputCls}
                value={n}
                aria-label={`Station ${i + 1} name`}
                onChange={(e) => setConfig({ stations: { ...stations, names: stations.names.map((x, j) => (j === i ? e.target.value : x)) } })}
              />
              <Button variant="ghost" disabled={stations.names.length <= 2} onClick={() => setConfig({ stations: { ...stations, names: stations.names.filter((_, j) => j !== i) } })}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setConfig({ stations: { ...stations, names: [...stations.names, `Station ${stations.names.length + 1}`] } })}>
            Add station
          </Button>
        </div>
      )}
      <p className="text-xs text-ink-soft">Times are based on the clock, so timers stay accurate in background tabs and after a refresh.</p>
    </div>
  );
}

const TimerWidget: WidgetModule = { Body, Mini, Settings };
export default TimerWidget;
