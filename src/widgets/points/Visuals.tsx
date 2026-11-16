"use client";
/**
 * Class point visuals: star jar, critter collection, build-a-monster and secret image reveal.
 * All artwork is original (SVG / emoji); nothing is loaded from the network.
 * Every visual is a pure function of the class's points, so taking a point away undoes progress.
 */
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/* ------------------------------------------------------------------ helpers */

/** Small deterministic PRNG so each class gets its own (stable) arrangement. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function shuffled(n: number, seed: string): number[] {
  const rnd = seeded(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clampPts = (p: number) => Math.max(0, Math.floor(p));

/* ------------------------------------------------------------------ star jar */

export function StarJar({ points, goal, reward, seed, big }: { points: number; goal: number; reward: string; seed: string; big?: boolean }) {
  const g = Math.max(1, goal);
  const slots = Math.min(g, 60);
  const filled = Math.min(slots, Math.round((clampPts(points) / g) * slots));
  const rnd = seeded(`jar:${seed}`);
  // Star positions inside the jar, filled from the bottom up.
  // Bigger stars for small goals; the jar is full exactly at the goal.
  const cols = slots <= 12 ? 3 : slots <= 30 ? 5 : 7;
  const rows = Math.ceil(slots / cols);
  const scale = Math.min(1, Math.max(0.45, Math.min(124 / cols / 30, 148 / rows / 30)));
  const stars = Array.from({ length: slots }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const colW = 124 / cols;
    return {
      x: 48 + colW * (col + 0.5) + (row % 2 ? colW / 4 : -colW / 4) + (rnd() - 0.5) * 4,
      y: 200 - (row + 0.5) * (148 / rows) + (rnd() - 0.5) * 4,
      r: rnd() * 40 - 20,
      hue: ["#ffcf33", "#ffb400", "#ff8fb1", "#7fd4ff", "#b48cff"][Math.floor(rnd() * 5)],
    };
  });
  return (
    <figure className="text-center" data-testid="points-jar">
      <svg viewBox="0 0 220 230" className={cx("mx-auto", big ? "h-80" : "h-44")} role="img" aria-label={`Star jar: ${Math.min(points, g)} of ${g} stars`}>
        <defs>
          <clipPath id={`jar-${seed}`}>
            <path d="M40 50 h140 v12 q14 6 14 26 v104 q0 26 -26 26 h-116 q-26 0 -26 -26 v-104 q0 -20 14 -26 z" />
          </clipPath>
        </defs>
        <rect x="52" y="22" width="116" height="26" rx="8" fill="#c8a06a" stroke="#8a6a3e" strokeWidth="3" />
        <path d="M40 50 h140 v12 q14 6 14 26 v104 q0 26 -26 26 h-116 q-26 0 -26 -26 v-104 q0 -20 14 -26 z" fill="#eaf6ff" fillOpacity=".55" stroke="#7aa9c9" strokeWidth="4" />
        <g clipPath={`url(#jar-${seed})`}>
          {stars.slice(0, filled).map((s, i) => (
            <path
              key={i}
              transform={`translate(${s.x} ${s.y}) rotate(${s.r}) scale(${scale.toFixed(2)})`}
              d="M0 -16 L4.7 -6.5 L15.2 -4.9 L7.6 2.5 L9.4 13 L0 8 L-9.4 13 L-7.6 2.5 L-15.2 -4.9 L-4.7 -6.5 Z"
              fill={s.hue}
              stroke="#00000022"
            />
          ))}
        </g>
        <path d="M58 70 q-6 40 0 110" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".6" fill="none" />
      </svg>
      <figcaption className="text-sm font-bold">
        {points >= g ? `🎉 Jar full! ${reward}` : `${g - Math.max(0, points)} more ${g - points === 1 ? "star" : "stars"} for: ${reward}`}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ critter collector */

export type Rarity = "common" | "rare" | "epic" | "legendary";
interface Critter {
  emoji: string;
  name: string;
}
const CRITTERS: Record<Rarity, Critter[]> = {
  common: [
    { emoji: "🐹", name: "Nibbles" }, { emoji: "🐰", name: "Hopscotch" }, { emoji: "🐱", name: "Whiskerpuff" }, { emoji: "🐶", name: "Barkley" },
    { emoji: "🐸", name: "Lilypop" }, { emoji: "🐥", name: "Peepsy" }, { emoji: "🐼", name: "Bambo" }, { emoji: "🐨", name: "Snoozy" },
    { emoji: "🦔", name: "Prickles" }, { emoji: "🐢", name: "Shellby" }, { emoji: "🐧", name: "Waddles" }, { emoji: "🐞", name: "Dotty" },
  ],
  rare: [
    { emoji: "🦊", name: "Emberfox" }, { emoji: "🦉", name: "Hootwise" }, { emoji: "🐬", name: "Splashfin" },
    { emoji: "🦋", name: "Glimmerwing" }, { emoji: "🐙", name: "Inkling" }, { emoji: "🦥", name: "Drowsel" },
  ],
  epic: [{ emoji: "🐲", name: "Sparkdrake" }, { emoji: "🦚", name: "Plumeburst" }, { emoji: "🦈", name: "Tidefang" }],
  legendary: [{ emoji: "🦄", name: "Starhorn" }, { emoji: "🐉", name: "Galaxion" }],
};
const RARITY_STYLE: Record<Rarity, { label: string; ring: string; bg: string }> = {
  common: { label: "Common", ring: "#9aa5b1", bg: "#f2f5f8" },
  rare: { label: "Rare", ring: "#2f80ed", bg: "#e6f0ff" },
  epic: { label: "Epic", ring: "#9b51e0", bg: "#f3e8ff" },
  legendary: { label: "Legendary", ring: "#f2a900", bg: "#fff6d6" },
};

/** Every 5 points earns a critter: every 10 is Rare, every 25 Epic, every 50 Legendary. */
export function rarityFor(milestone: number): Rarity {
  if (milestone % 10 === 0) return "legendary";
  if (milestone % 5 === 0) return "epic";
  if (milestone % 2 === 0) return "rare";
  return "common";
}

export function critterCollection(points: number, seed: string, every = 5) {
  const n = Math.floor(clampPts(points) / every);
  const rnd = seeded(`critters:${seed}`);
  return Array.from({ length: n }, (_, i) => {
    const rarity = rarityFor(i + 1);
    const pool = CRITTERS[rarity];
    return { ...pool[Math.floor(rnd() * pool.length)], rarity, at: (i + 1) * every };
  });
}

export function CritterCollector({ points, seed, big }: { points: number; seed: string; big?: boolean }) {
  const every = 5;
  const got = critterCollection(points, seed, every);
  const toNext = every - (clampPts(points) % every);
  const nextRarity = rarityFor(got.length + 1);
  return (
    <div className="space-y-2" data-testid="points-collector">
      <p className="text-center text-sm font-bold">
        {got.length} {got.length === 1 ? "critter" : "critters"} collected · next <span style={{ color: RARITY_STYLE[nextRarity].ring }}>{RARITY_STYLE[nextRarity].label}</span> in {toNext}{" "}
        {toNext === 1 ? "point" : "points"}
      </p>
      <ul className={cx("grid gap-1.5", big ? "grid-cols-[repeat(auto-fill,minmax(110px,1fr))]" : "max-h-56 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] overflow-y-auto")}>
        {got.map((c, i) => {
          const st = RARITY_STYLE[c.rarity];
          return (
            <li
              key={i}
              className={cx("rounded-xl border-2 p-1 text-center", c.rarity !== "common" && "shadow-[0_0_12px_rgba(0,0,0,.12)]")}
              style={{ borderColor: st.ring, background: st.bg, color: "#1f2733" }}
              title={`${c.name} · ${st.label} · earned at ${c.at} points`}
            >
              <span className={cx("block leading-none", big ? "text-5xl" : "text-3xl")} aria-hidden>
                {c.emoji}
              </span>
              <span className="block truncate text-[11px] font-extrabold">{c.name}</span>
              <span className="block text-[10px] font-bold" style={{ color: st.ring }}>
                {c.rarity === "legendary" ? "✨ " : ""}
                {st.label}
              </span>
            </li>
          );
        })}
        {got.length === 0 && <li className="col-span-full py-3 text-center text-sm text-ink-soft">Earn 5 points to hatch your first critter! 🥚</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ build-a-monster */

const MONSTER_PARTS = ["Body", "Eyes", "Smile", "Horns", "Arms", "Feet", "Spots", "Bow tie", "Party hat", "Crown"] as const;

export function monsterProgress(points: number, goal: number) {
  const per = Math.max(1, Math.ceil(Math.max(1, goal) / MONSTER_PARTS.length));
  const parts = Math.min(MONSTER_PARTS.length, Math.floor(clampPts(points) / per));
  return { per, parts, next: MONSTER_PARTS[parts] ?? null, toNext: parts >= MONSTER_PARTS.length ? 0 : per - (clampPts(points) % per) };
}

export function Monster({ points, goal, seed, big }: { points: number; goal: number; seed: string; big?: boolean }) {
  const { parts, next, toNext } = monsterProgress(points, goal);
  const palette = [
    ["#7ed957", "#4caf2e"],
    ["#5ec8ff", "#2e8fd1"],
    ["#ff9ad5", "#e05ba6"],
    ["#ffb84d", "#e08a1a"],
    ["#b28dff", "#7f56d9"],
  ];
  const [fill, dark] = palette[Math.floor(seeded(`monster:${seed}`)() * palette.length)];
  const has = (n: number) => parts >= n;
  const layers: ReactNode[] = [];
  if (!has(1)) layers.push(<text key="egg" x="100" y="120" textAnchor="middle" fontSize="70">🥚</text>);
  if (has(6)) layers.push(<g key="feet" fill={dark}><ellipse cx="72" cy="178" rx="20" ry="10" /><ellipse cx="128" cy="178" rx="20" ry="10" /></g>);
  if (has(5)) layers.push(<g key="arms" stroke={dark} strokeWidth="12" strokeLinecap="round" fill="none"><path d="M42 115 q-22 -10 -24 -32" /><path d="M158 115 q22 -10 24 -32" /></g>);
  if (has(4)) layers.push(<g key="horns" fill="#fff4d6" stroke="#c9a96b" strokeWidth="3"><path d="M64 52 l-10 -32 l26 22 z" /><path d="M136 52 l10 -32 l-26 22 z" /></g>);
  if (has(1)) layers.push(<ellipse key="body" cx="100" cy="115" rx="62" ry="66" fill={fill} stroke={dark} strokeWidth="4" />);
  if (has(7)) layers.push(<g key="spots" fill={dark} opacity=".35"><circle cx="70" cy="140" r="8" /><circle cx="134" cy="150" r="6" /><circle cx="120" cy="80" r="5" /><circle cx="78" cy="88" r="4" /></g>);
  if (has(2)) layers.push(<g key="eyes"><circle cx="80" cy="100" r="15" fill="#fff" stroke={dark} strokeWidth="3" /><circle cx="120" cy="100" r="15" fill="#fff" stroke={dark} strokeWidth="3" /><circle cx="84" cy="103" r="7" fill="#222" /><circle cx="116" cy="103" r="7" fill="#222" /><circle cx="86" cy="100" r="2.5" fill="#fff" /><circle cx="118" cy="100" r="2.5" fill="#fff" /></g>);
  if (has(3)) layers.push(<g key="mouth"><path d="M76 132 q24 24 48 0" fill="#7a1f3d" stroke={dark} strokeWidth="3" /><path d="M88 134 l5 8 l5 -8 M104 134 l5 8 l5 -8" fill="#fff" /></g>);
  if (has(8)) layers.push(<g key="tie" fill="#e5484d" stroke="#a3262b" strokeWidth="2"><path d="M100 168 l-18 -10 v20 z" /><path d="M100 168 l18 -10 v20 z" /><circle cx="100" cy="168" r="5" /></g>);
  if (has(9)) layers.push(<g key="hat"><path d="M100 4 l-20 46 h40 z" fill="#ffcf33" stroke="#d99b00" strokeWidth="3" /><circle cx="100" cy="6" r="6" fill="#ff7ab6" /></g>);
  if (has(10)) layers.push(<g key="crown" fill="#ffd400" stroke="#c99a00" strokeWidth="2"><path d="M60 46 l10 -20 l12 14 l18 -22 l18 22 l12 -14 l10 20 z" /></g>);
  return (
    <figure className="text-center" data-testid="points-monster">
      <svg viewBox="0 0 200 200" className={cx("mx-auto", big ? "h-80" : "h-44")} role="img" aria-label={`Class monster with ${parts} of ${MONSTER_PARTS.length} parts`}>
        {layers}
      </svg>
      <figcaption className="text-sm font-bold">
        {next ? `Next: ${next} in ${toNext} ${toNext === 1 ? "point" : "points"}` : "🎉 Monster complete!"}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ secret image reveal */

export const PRESET_IMAGES: { id: string; name: string; svg: string }[] = [
  {
    id: "space",
    name: "Rocket in space",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><radialGradient id="g" cx=".3" cy=".3"><stop offset="0" stop-color="#3b2a8f"/><stop offset="1" stop-color="#0b0d2b"/></radialGradient></defs><rect width="400" height="300" fill="url(#g)"/><g fill="#fff">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 300}" r="${(i % 3) + 1}"/>`).join("")}</g><circle cx="320" cy="70" r="40" fill="#ffb84d"/><ellipse cx="320" cy="70" rx="62" ry="12" fill="none" stroke="#ffe0a3" stroke-width="5"/><circle cx="70" cy="240" r="55" fill="#5ec8ff"/><path d="M40 225 q30 -20 60 5" stroke="#2e8fd1" stroke-width="10" fill="none"/><g transform="translate(200 160) rotate(30)"><path d="M0 -90 q30 30 30 90 v40 h-60 v-40 q0 -60 30 -90z" fill="#f2f5f8" stroke="#8796a5" stroke-width="4"/><circle cx="0" cy="-30" r="14" fill="#5ec8ff" stroke="#2e8fd1" stroke-width="4"/><path d="M-30 20 l-22 30 h22z M30 20 l22 30 h-22z" fill="#e5484d"/><path d="M-18 40 q18 50 36 0z" fill="#ffcf33"/><path d="M-10 40 q10 30 20 0z" fill="#ff7a1a"/></g></svg>`,
  },
  {
    id: "ocean",
    name: "Under the sea",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ec8ff"/><stop offset="1" stop-color="#1765b5"/></linearGradient></defs><rect width="400" height="300" fill="url(#w)"/><path d="M0 260 q100 -30 200 0 t200 0 v40 h-400z" fill="#f4d58d"/><g fill="#2bb673"><path d="M40 270 q-10 -60 10 -110 q10 50 -2 110z"/><path d="M350 270 q-14 -70 6 -130 q14 60 2 130z"/></g><g transform="translate(190 140)"><ellipse rx="60" ry="36" fill="#ff8a3d"/><path d="M55 0 l40 -30 v60z" fill="#ff8a3d"/><path d="M-20 -34 v68 M10 -34 v68" stroke="#fff" stroke-width="10"/><circle cx="-38" cy="-8" r="9" fill="#fff"/><circle cx="-40" cy="-8" r="5" fill="#222"/></g><g fill="#fff" opacity=".7"><circle cx="110" cy="100" r="8"/><circle cx="120" cy="75" r="5"/><circle cx="105" cy="55" r="3"/></g><g transform="translate(300 230)" fill="#e5484d"><circle r="14"/><path d="M-14 0 l-12 -10 M14 0 l12 -10" stroke="#e5484d" stroke-width="5"/></g></svg>`,
  },
  {
    id: "dino",
    name: "Friendly dinosaur",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#bfe9ff"/><circle cx="340" cy="60" r="34" fill="#ffd400"/><path d="M0 230 h400 v70 h-400z" fill="#7ed957"/><path d="M60 230 l30 -60 l30 60z M300 230 l25 -45 l25 45z" fill="#4caf2e"/><g transform="translate(190 175)"><path d="M-110 30 q-10 -40 40 -40 h70 q40 -70 90 -40 q20 15 0 30 h-30 q-10 40 -30 60 v40 h-25 v-35 h-40 v35 h-25 v-45 q-30 0 -50 -5z" fill="#2bb673" stroke="#1d7f4f" stroke-width="5"/><circle cx="72" cy="-62" r="6" fill="#222"/><path d="M-40 -12 l10 -18 l10 18 M-10 -14 l10 -18 l10 18 M20 -14 l10 -18 l10 18" fill="#ffcf33"/><path d="M90 -40 q-12 10 -24 4" stroke="#1d7f4f" stroke-width="4" fill="none"/></g></svg>`,
  },
  {
    id: "rainbow",
    name: "Rainbow castle",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#fff4fb"/><g fill="none" stroke-width="16"><path d="M40 260 a160 160 0 0 1 320 0" stroke="#e5484d"/><path d="M56 260 a144 144 0 0 1 288 0" stroke="#ff8a3d"/><path d="M72 260 a128 128 0 0 1 256 0" stroke="#ffd400"/><path d="M88 260 a112 112 0 0 1 224 0" stroke="#2bb673"/><path d="M104 260 a96 96 0 0 1 192 0" stroke="#2f80ed"/><path d="M120 260 a80 80 0 0 1 160 0" stroke="#9b51e0"/></g><g fill="#ffd6ec" stroke="#d65aa0" stroke-width="4"><rect x="150" y="170" width="100" height="90"/><rect x="135" y="140" width="30" height="120"/><rect x="235" y="140" width="30" height="120"/></g><g fill="#9b51e0"><path d="M130 142 l20 -36 l20 36z M230 142 l20 -36 l20 36z"/></g><path d="M185 260 v-36 a15 15 0 0 1 30 0 v36z" fill="#d65aa0"/><g fill="#fff"><ellipse cx="60" cy="70" rx="40" ry="18"/><ellipse cx="330" cy="50" rx="44" ry="18"/></g></svg>`,
  },
  {
    id: "puppy",
    name: "Puppy in a garden",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#dff7d8"/><g fill="#ff9ad5">${Array.from({ length: 10 }, (_, i) => `<circle cx="${20 + i * 40}" cy="${270 - (i % 2) * 14}" r="9"/>`).join("")}</g><g transform="translate(200 160)"><ellipse cx="0" cy="70" rx="80" ry="40" fill="#d9a066"/><circle r="70" fill="#e8b97e" stroke="#9c6a35" stroke-width="5"/><ellipse cx="-70" cy="-10" rx="22" ry="44" fill="#9c6a35" transform="rotate(20 -70 -10)"/><ellipse cx="70" cy="-10" rx="22" ry="44" fill="#9c6a35" transform="rotate(-20 70 -10)"/><circle cx="-24" cy="-10" r="9" fill="#222"/><circle cx="24" cy="-10" r="9" fill="#222"/><ellipse cx="0" cy="18" rx="14" ry="10" fill="#222"/><path d="M-16 34 q16 16 32 0" stroke="#222" stroke-width="4" fill="none"/><path d="M-6 40 q6 18 12 0z" fill="#ff7ab6"/></g></svg>`,
  },
];

export function presetImageUrl(id: string): string | null {
  const p = PRESET_IMAGES.find((x) => x.id === id);
  return p ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg)}` : null;
}

/** "preset:space" or an uploaded data: URL. */
export function imageSrcFor(value: string | undefined | null): string {
  if (value?.startsWith("data:image/")) return value;
  return presetImageUrl(value?.replace(/^preset:/, "") ?? "") ?? presetImageUrl("space")!;
}

export function revealGrid(goal: number) {
  const n = Math.max(4, Math.min(100, Math.round(goal) || 20));
  const cols = Math.max(2, Math.round(Math.sqrt((n * 4) / 3)));
  const rows = Math.ceil(n / cols);
  return { n: cols * rows, cols, rows };
}

/** Which tiles are uncovered for this many points (one tile per point; losing a point covers one back up). */
export function revealedTiles(points: number, goal: number, seed: string): Set<number> {
  const { n } = revealGrid(goal);
  const order = shuffled(n, `reveal:${seed}`);
  // When the grid has a few extra tiles, reveal them all at the goal.
  const shown = points >= goal ? n : Math.min(n, clampPts(points));
  return new Set(order.slice(0, shown));
}

export function SecretImage({ points, goal, image, seed, big }: { points: number; goal: number; image: string | null | undefined; seed: string; big?: boolean }) {
  const { cols, rows, n } = revealGrid(goal);
  const shown = revealedTiles(points, goal, seed);
  const done = shown.size >= n;
  return (
    <figure className="space-y-1 text-center" data-testid="points-reveal">
      <div className={cx("relative mx-auto aspect-[4/3] overflow-hidden rounded-2xl border-4 border-line", big ? "max-w-2xl" : "max-w-sm")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrcFor(image)} alt={done ? "The secret picture" : ""} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              data-covered={!shown.has(i) || undefined}
              className={cx("flex items-center justify-center border border-white/40 text-white transition-opacity duration-500", shown.has(i) ? "opacity-0" : "opacity-100")}
              style={{ background: i % 2 ? "#6c5ce7" : "#5b4bd6", fontSize: big ? 28 : 16, fontWeight: 900 }}
            >
              ?
            </div>
          ))}
        </div>
      </div>
      <figcaption className="text-sm font-bold" data-testid="reveal-count">
        {done ? "🎉 Secret picture revealed!" : `${shown.size} of ${n} pieces revealed`}
      </figcaption>
    </figure>
  );
}

/** Shrink an uploaded picture so it stores quickly on the device (never uploaded anywhere). */
export async function downscaleImage(file: File, max = 900): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a picture."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
