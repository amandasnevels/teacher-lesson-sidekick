"use client";
import { Square, Star, Volume2, VolumeX } from "lucide-react";
import { useSidekick } from "@/store/store";
import { useConfig } from "@/store/hooks";
import { SOUNDS, playSound, stopAllSounds } from "@/lib/audio";
import type { SoundId } from "@/lib/types";
import { Button, IconButton, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<{ favorites: SoundId[] }>(id);
  const volume = useSidekick((s) => s.prefs.volume);
  const muted = useSidekick((s) => s.prefs.muted);
  const favs = c.favorites ?? [];
  const ordered = [...SOUNDS].sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));
  return (
    <div className="space-y-3">
      <ul className={cx("grid gap-2", view === "expanded" ? "grid-cols-3" : "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]")}>
        {ordered.map((s) => (
          <li key={s.id} className="relative">
            <button
              type="button"
              onClick={() => {
                if (muted) useSidekick.getState().toast({ message: "Sound is muted", tone: "warn", actionLabel: "Unmute", onAction: () => useSidekick.getState().setPrefs({ muted: false }) });
                else playSound(s.id);
              }}
              className="flex min-h-16 w-full flex-col items-center justify-center rounded-2xl bg-soft px-2 py-2 font-bold transition hover:brightness-95 active:scale-95"
              aria-label={`Play ${s.name}`}
            >
              <span className="text-2xl" aria-hidden>{s.emoji}</span>
              <span className="text-sm">{s.name}</span>
            </button>
            <button
              type="button"
              aria-label={favs.includes(s.id) ? `Unfavorite ${s.name}` : `Favorite ${s.name}`}
              aria-pressed={favs.includes(s.id)}
              onClick={() => set({ favorites: favs.includes(s.id) ? favs.filter((x) => x !== s.id) : [...favs, s.id] })}
              className="absolute right-0.5 top-0.5 flex h-8 w-8 items-center justify-center rounded-full"
            >
              <Star size={14} className={favs.includes(s.id) ? "fill-[#f5b700] text-[#c98a00]" : "text-ink-soft"} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={stopAllSounds}>
          <Square size={14} /> Stop
        </Button>
        <IconButton label={muted ? "Unmute" : "Mute"} onClick={() => useSidekick.getState().setPrefs({ muted: !muted })} aria-pressed={muted}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </IconButton>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label="Volume"
          className="min-w-0 flex-1 accent-[var(--accent)]"
          onChange={(e) => useSidekick.getState().setPrefs({ volume: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

const SoundboardWidget: WidgetModule = { Body };
export default SoundboardWidget;
