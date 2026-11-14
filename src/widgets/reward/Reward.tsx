"use client";
import { useRef, useState } from "react";
import { ImageUp, Minus, Plus, RotateCcw } from "lucide-react";
import { scopeKey, useSidekick } from "@/store/store";
import { useActiveClass, useConfig } from "@/store/hooks";
import { Button, Confetti, Field, IconButton, Toggle, cx, inputCls } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

type Style = "stars" | "bar" | "jar" | "puzzle" | "plant" | "creature" | "picture";
interface RewardConfig {
  style: Style;
  goal: number;
  label: string;
  image: string | null;
  celebrate: boolean;
}

const STYLES: { value: Style; label: string }[] = [
  { value: "jar", label: "🫙 Jar" },
  { value: "stars", label: "⭐ Stars" },
  { value: "bar", label: "▬ Bar" },
  { value: "puzzle", label: "🧩 Puzzle" },
  { value: "plant", label: "🌱 Plant" },
  { value: "creature", label: "🐣 Creature" },
  { value: "picture", label: "🖼️ Picture" },
];

const PLANT = ["🌰", "🌱", "🌿", "🪴", "🌳", "🌸"];
const CREATURE = ["🥚", "🐣", "🐥", "🐤", "🐔", "🦚"];
const MARBLES = ["#e5484d", "#f5b700", "#2bb673", "#0c8ce9", "#8e4ec6", "#d6409f", "#f76b15"];

function Visual({ c, value, big }: { c: RewardConfig; value: number; big: boolean }) {
  const goal = Math.max(1, c.goal);
  const frac = Math.min(1, value / goal);
  const size = big ? "text-8xl" : "text-6xl";
  switch (c.style) {
    case "stars":
      return (
        <div className="flex flex-wrap justify-center gap-1" aria-hidden>
          {Array.from({ length: goal }, (_, i) => (
            <span key={i} className={cx(big ? "text-4xl" : "text-2xl", i < value ? "" : "opacity-20 grayscale")}>⭐</span>
          ))}
        </div>
      );
    case "bar":
      return (
        <div className="h-6 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${frac * 100}%` }} />
        </div>
      );
    case "jar": {
      const shown = Math.min(value, goal);
      const cols = 6;
      return (
        <svg viewBox="0 0 120 140" className={cx("mx-auto", big ? "w-72" : "w-32")} aria-hidden>
          <rect x="30" y="6" width="60" height="12" rx="4" fill="var(--ink-soft)" opacity=".6" />
          <path d="M28 20 h64 q8 0 8 10 v94 q0 12 -12 12 h-56 q-12 0 -12 -12 v-94 q0 -10 8 -10z" fill="var(--soft)" stroke="var(--ink-soft)" strokeWidth="3" />
          {Array.from({ length: shown }, (_, i) => {
            const perJar = Math.ceil(goal / cols);
            const r = Math.max(3.5, Math.min(8, 100 / (perJar * 2.1)));
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = 32 + r + col * ((56 - 2 * r) / (cols - 1));
            const y = 130 - r - row * r * 1.85;
            return <circle key={i} cx={x + (row % 2 ? r * 0.4 : 0)} cy={y} r={r} fill={MARBLES[i % MARBLES.length]} className="pop-in" />;
          })}
        </svg>
      );
    }
    case "puzzle": {
      const cols = Math.ceil(Math.sqrt(goal));
      return (
        <div className="mx-auto grid max-w-56 gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden>
          {Array.from({ length: goal }, (_, i) => (
            <div key={i} className={cx("aspect-square rounded", i < value ? "" : "bg-line")} style={i < value ? { background: MARBLES[i % MARBLES.length] } : undefined} />
          ))}
        </div>
      );
    }
    case "plant":
    case "creature": {
      const stages = c.style === "plant" ? PLANT : CREATURE;
      const stage = Math.min(stages.length - 1, Math.floor(frac * (stages.length - 1)));
      return <p className={cx("text-center transition-all", size)} style={{ transform: `scale(${0.7 + frac * 0.5})` }} aria-hidden>{stages[stage]}</p>;
    }
    case "picture":
      return c.image ? (
        <div className="relative mx-auto aspect-video max-w-72 overflow-hidden rounded-xl" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.image} alt="" className="h-full w-full object-cover" style={{ filter: `blur(${(1 - frac) * 14}px) grayscale(${1 - frac})` }} />
        </div>
      ) : (
        <p className="text-center text-sm text-ink-soft">Upload a picture in More Settings. It is revealed as the class earns points.</p>
      );
  }
}

async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 640 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<RewardConfig>(id);
  const cls = useActiveClass();
  const key = scopeKey(cls?.id ?? null, id);
  const value = useSidekick((s) => s.records.rewards[key] ?? 0);
  const [burst, setBurst] = useState(0);
  const st = useSidekick.getState;
  const change = (d: number) => {
    const next = Math.max(0, value + d);
    if (c.celebrate && value < c.goal && next >= c.goal) {
      setBurst((b) => b + 1);
      st().toast({ message: `🏆 ${c.label}: goal reached!`, tone: "success" });
    }
    st().setReward(key, next);
  };
  return (
    <div className="relative space-y-3 text-center">
      <Confetti burst={burst} />
      <input className="w-full bg-transparent text-center font-extrabold focus:outline-none" value={c.label} onChange={(e) => set({ label: e.target.value })} aria-label="Reward name" maxLength={50} />
      <div className="flex flex-wrap justify-center gap-1">
        {STYLES.map((s) => (
          <button key={s.value} type="button" aria-pressed={c.style === s.value} onClick={() => set({ style: s.value })} className={cx("min-h-8 rounded-full px-2 text-xs font-bold", c.style === s.value ? "bg-accent text-on-accent" : "bg-soft")}>
            {s.label}
          </button>
        ))}
      </div>
      <Visual c={c} value={value} big={view === "expanded"} />
      <p className="font-black" data-testid="reward-value" aria-live="polite">
        {value} / {c.goal} {value >= c.goal && "🎉"}
      </p>
      <div className="flex justify-center gap-2">
        <IconButton label="Remove one" variant="outline" onClick={() => change(-1)}>
          <Minus size={18} />
        </IconButton>
        <Button variant="accent" onClick={() => change(1)}>
          <Plus size={18} /> Add
        </Button>
        <IconButton label="Reset reward" variant="ghost" onClick={() => st().setReward(key, 0)}>
          <RotateCcw size={16} />
        </IconButton>
      </div>
      {cls && <p className="text-xs text-ink-soft">Progress saved for {cls.name}</p>}
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<RewardConfig>(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Field label="Goal">
        <input type="number" min={1} max={100} className={inputCls} value={c.goal} onChange={(e) => set({ goal: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
      </Field>
      <Toggle checked={c.celebrate} onChange={(celebrate) => set({ celebrate })} label="Celebrate at goal" />
      <Field label="Reward picture" hint="Stored only on this device. Not included in exported packs.">
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Reward picture file" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 8_000_000) return setErr("Please choose an image under 8 MB.");
          try {
            set({ image: await shrinkImage(f), style: "picture" });
            setErr(null);
          } catch {
            setErr("That image couldn't be read.");
          }
        }} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}><ImageUp size={16} /> Choose picture</Button>
          {c.image && <Button variant="ghost" onClick={() => set({ image: null })}>Remove</Button>}
        </div>
        {err && <p role="alert" className="text-sm text-[#d93036]">{err}</p>}
      </Field>
    </div>
  );
}

const RewardWidget: WidgetModule = { Body, Settings };
export default RewardWidget;
