"use client";
import { Pencil } from "lucide-react";
import { useSidekick } from "@/store/store";
import { dockItemInfo, runDockItem } from "@/store/actions";
import { colorOf } from "@/lib/colors";
import { cx } from "./ui";

/** Permanent, compact one-tap dock. Every item performs a real action. */
export function QuickDock() {
  const items = useSidekick((s) => s.dock);
  const pos = useSidekick((s) => s.prefs.dockPosition);
  // Re-render when referenced routines/favorites/widgets are renamed.
  useSidekick((s) => s.routines);
  useSidekick((s) => s.favorites);
  const vertical = pos === "left" || pos === "right";

  return (
    <nav
      aria-label="Quick Dock"
      className={cx(
        "bg-card/90 backdrop-blur",
        vertical ? "h-full w-[64px] overflow-y-auto border-line py-2" : "border-line px-2 py-1.5",
        pos === "bottom" && "border-t pb-[max(6px,env(safe-area-inset-bottom))]",
        pos === "top" && "border-b",
        pos === "left" && "border-r",
        pos === "right" && "border-l",
      )}
    >
      <ul className={cx("no-scrollbar flex gap-1.5", vertical ? "flex-col items-center" : "overflow-x-auto")}>
        {items.map((item) => {
          const info = dockItemInfo(item);
          const c = info.color ? colorOf(info.color) : null;
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => runDockItem(item)}
                disabled={info.missing}
                title={info.label}
                aria-label={info.label}
                data-testid={`dock-${item.kind}`}
                className={cx(
                  "flex flex-col items-center justify-center rounded-2xl font-bold transition active:scale-95 disabled:opacity-40",
                  vertical ? "h-14 w-14 text-[10px]" : "h-[52px] min-w-[56px] max-w-[84px] px-1.5 text-[11px]",
                  c ? "" : "bg-black/5 hover:bg-black/10 dark:bg-white/10",
                )}
                style={c ? { background: `color-mix(in srgb, ${c.accent} 18%, var(--card))` } : undefined}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {info.emoji}
                </span>
                <span className="mt-0.5 w-full truncate text-center leading-tight">{info.label}</span>
              </button>
            </li>
          );
        })}
        <li className="shrink-0">
          <button
            type="button"
            onClick={() => useSidekick.getState().openSettings("dock")}
            aria-label="Customize Quick Dock"
            title="Customize Quick Dock"
            className={cx("flex items-center justify-center rounded-2xl border-2 border-dashed border-line text-ink-soft hover:text-ink", vertical ? "h-14 w-14" : "h-[52px] w-11")}
          >
            <Pencil size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
