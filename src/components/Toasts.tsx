"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useSidekick, type Toast } from "@/store/store";
import { cx, useOpenModalCount } from "./ui";

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useSidekick((s) => s.dismissToast);
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), t.timeout ?? 3500);
    return () => clearTimeout(h);
  }, [t.id, t.timeout, dismiss]);
  return (
    <li
      className={cx(
        "pop-in pointer-events-auto flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold shadow-xl",
        t.tone === "warn" ? "bg-[#fff1c2] text-[#4a3500]" : t.tone === "success" ? "bg-[#1f7a4d] text-white" : "bg-[#1d2433] text-white",
      )}
    >
      <span className="min-w-0 flex-1">{t.message}</span>
      {t.actionLabel && (
        <button
          type="button"
          className="min-h-9 shrink-0 rounded-lg bg-white/20 px-3 font-black underline-offset-2 hover:bg-white/30"
          onClick={() => {
            t.onAction?.();
            dismiss(t.id);
          }}
        >
          {t.actionLabel}
        </button>
      )}
      <button type="button" aria-label="Dismiss" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/20" onClick={() => dismiss(t.id)}>
        <X size={14} />
      </button>
    </li>
  );
}

export function Toasts() {
  const toasts = useSidekick((s) => s.toasts);
  const dock = useSidekick((s) => s.prefs.dockPosition);
  const modalOpen = useOpenModalCount() > 0;
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-2 z-[70] mx-auto flex max-w-md flex-col gap-2"
      style={modalOpen ? { top: "12px" } : { bottom: dock === "bottom" ? "calc(76px + env(safe-area-inset-bottom))" : "16px" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </ol>
  );
}
