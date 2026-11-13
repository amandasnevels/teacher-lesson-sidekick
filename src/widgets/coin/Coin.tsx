"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useReducedMotion, useSession, useSignal } from "@/store/hooks";
import { coinRotationFor, type CoinSide } from "@/lib/geometry";
import { randomInt } from "@/lib/random";
import { Button, IconButton, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface CoinSession {
  rotation: number;
  result: CoinSide | null;
  heads: number;
  tails: number;
}

function Face({ side, size }: { side: CoinSide; size: number }) {
  const heads = side === "heads";
  return (
    <div
      data-coin-face={side}
      className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-full border-[6px] font-black text-[#5c3d00] shadow-inner"
      style={{
        transform: heads ? "translateZ(3px)" : "rotateX(180deg) translateZ(3px)",
        background: heads ? "radial-gradient(circle at 35% 30%, #fff3b0, #f5b700 55%, #c98a00)" : "radial-gradient(circle at 35% 30%, #fde7c2, #e0a24a 55%, #a86b12)",
        borderColor: heads ? "#d99a00" : "#9a6210",
      }}
    >
      <span className="leading-none" style={{ fontSize: size * 0.36 }}>{heads ? "★" : "🦉"}</span>
      <span className="uppercase tracking-widest" style={{ fontSize: Math.max(11, size * 0.12) }}>{heads ? "Heads" : "Tails"}</span>
    </div>
  );
}

function Body({ id, view }: WidgetProps) {
  const [session, setSession] = useSession<CoinSession>(id);
  const reduced = useReducedMotion();
  const [flipping, setFlipping] = useState(false);
  const s: CoinSession = session ?? { rotation: 0, result: null, heads: 0, tails: 0 };
  const size = view === "expanded" ? 220 : 120;
  const durationMs = reduced ? 250 : 1700;

  const flip = () => {
    if (flipping) return; // no overlapping flips
    const result: CoinSide = randomInt(2) === 0 ? "heads" : "tails";
    setFlipping(true);
    setSession({ ...s, rotation: coinRotationFor(result, s.rotation, reduced ? 1 : 5), result });
  };
  useSignal(id, (sig) => sig.name === "flip" && flip());

  return (
    <div className="space-y-3 text-center">
      <div className="flex justify-center py-2" style={{ perspective: size * 5 }}>
        <div className={cx(flipping && !reduced && "animate-[coinhop_1.7s_ease-out]")} style={{ width: size, height: size }}>
          <div
            data-testid="coin"
            data-result={s.result ?? ""}
            data-rotation={s.rotation}
            className="preserve-3d relative h-full w-full"
            style={{ transform: `rotateX(${s.rotation}deg)`, transition: flipping ? `transform ${durationMs}ms cubic-bezier(.2,.75,.25,1)` : "none" }}
            onTransitionEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              setFlipping(false);
              setSession((prev) => (prev && prev.result ? { ...prev, heads: prev.heads + (prev.result === "heads" ? 1 : 0), tails: prev.tails + (prev.result === "tails" ? 1 : 0) } : prev));
            }}
          >
            <Face side="heads" size={size} />
            <Face side="tails" size={size} />
          </div>
        </div>
      </div>
      <p className="min-h-8 text-2xl font-black capitalize" aria-live="polite" data-testid="coin-result">
        {flipping ? "Flipping…" : s.result ?? " "}
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="accent" size={view === "expanded" ? "lg" : "md"} onClick={flip} disabled={flipping} className="min-w-28">
          🪙 {s.result ? "Flip again" : "Flip"}
        </Button>
        <IconButton label="Reset coin" variant="outline" disabled={flipping} onClick={() => setSession(undefined)}>
          <RotateCcw size={18} />
        </IconButton>
      </div>
      {s.heads + s.tails > 0 && (
        <p className="text-xs font-semibold text-ink-soft">
          Heads {s.heads} · Tails {s.tails}
        </p>
      )}
    </div>
  );
}

const CoinWidget: WidgetModule = { Body };
export default CoinWidget;
