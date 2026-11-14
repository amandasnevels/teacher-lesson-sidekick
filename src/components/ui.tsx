"use client";
/**
 * Small, consistent, accessible UI kit used across the app.
 * Touch targets are ≥ 40px; every control has a visible focus ring (globals.css).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "accent" | "soft" | "ghost" | "danger" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:brightness-110 shadow-sm",
  accent: "bg-accent text-on-accent hover:brightness-110 shadow-sm",
  soft: "bg-soft text-ink hover:brightness-95",
  ghost: "bg-transparent text-ink hover:bg-black/5 dark:hover:bg-white/10",
  danger: "bg-[#d93036] text-white hover:brightness-110",
  outline: "border-2 border-line bg-card text-ink hover:bg-black/5 dark:hover:bg-white/10",
};

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "soft", size = "md", className, type = "button", ...rest },
  ref,
) {
  const sizes = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-[15px]", lg: "min-h-14 px-6 text-lg" };
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex select-none items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
});

const ICON_SIZES = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-10 w-10", xl: "h-12 w-12" } as const;

export const IconButton = forwardRef<HTMLButtonElement, Omit<BtnProps, "size"> & { label: string; size?: keyof typeof ICON_SIZES }>(function IconButton(
  { label, variant = "ghost", className, children, type = "button", size = "lg", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40",
        ICON_SIZES[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </label>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex flex-wrap gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-h-9 flex-1 rounded-lg px-2 text-sm font-semibold transition",
            o.value === value ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full min-h-11 rounded-xl border-2 border-line bg-card px-3 text-[15px] text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none";

/* ------------------------------------------------------------------ Modal */

let openModals = 0;
const modalListeners = new Set<() => void>();
function setOpenModals(delta: number) {
  openModals += delta;
  modalListeners.forEach((l) => l());
}
/** Number of pop-ups currently open (toasts move to the top so they never cover one). */
export function useOpenModalCount() {
  return useSyncExternalStore(
    (cb) => {
      modalListeners.add(cb);
      return () => modalListeners.delete(cb);
    },
    () => openModals,
    () => 0,
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  labelledBy,
  panelStyle,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  labelledBy?: string;
  /** e.g. a widget's accent colors, since pop-ups render outside the widget. */
  panelStyle?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setOpenModals(1);
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>("input,textarea,select,button");
      el?.focus();
    }, 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>("button,input,select,textarea,a[href],[tabindex]:not([tabindex='-1'])")).filter(
          (x) => !x.hasAttribute("disabled"),
        );
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      setOpenModals(-1);
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/40 p-0 backdrop-blur-[2px] sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        style={panelStyle}
        className={cx(
          "modal-panel pop-in mx-auto mt-auto flex w-full flex-col overflow-hidden rounded-t-3xl bg-card text-ink shadow-2xl sm:my-auto sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-lg font-extrabold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Confirm */

export function useConfirm() {
  const [state, setState] = useState<{ message: string; confirmLabel: string; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback(
    (message: string, confirmLabel = "Delete") => new Promise<boolean>((resolve) => setState({ message, confirmLabel, resolve })),
    [],
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const element = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title="Are you sure?"
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => close(true)} data-autofocus>
            {state?.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[15px]">{state?.message}</p>
    </Modal>
  );
  return [element, ask] as const;
}

/* ------------------------------------------------------------------ Popover menu */

/**
 * A viewport-clamped popover (portal) so menus are never clipped by cards or narrow windows.
 */
export function Popover({
  anchor,
  open,
  onClose,
  children,
  label,
  width = 230,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(width, vw - 16);
      const left = Math.max(8, Math.min(r.right - w, vw - w - 8));
      const h = ref.current?.offsetHeight ?? 300;
      const below = vh - r.bottom - 8;
      const above = r.top - 8;
      const openUp = below < Math.min(h, 320) && above > below;
      const maxH = Math.max(160, (openUp ? above : below) - 4);
      const top = openUp ? Math.max(8, r.top - Math.min(h, maxH) - 4) : r.bottom + 4;
      setPos({ top, left, maxH });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        anchor?.focus();
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>("[role=menuitem],[role=menuitemradio]"));
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: Math.min(width, typeof window !== "undefined" ? window.innerWidth - 16 : width), maxHeight: pos?.maxH }}
      className="fixed z-[60] overflow-y-auto rounded-2xl border border-line bg-card p-1.5 text-ink shadow-2xl"
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({ icon, children, onSelect, danger }: { icon?: ReactNode; children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cx(
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-semibold hover:bg-black/5 focus:bg-black/5 focus:outline-none dark:hover:bg-white/10 dark:focus:bg-white/10",
        danger && "text-[#d93036] dark:text-[#ff8a8f]",
      )}
    >
      <span className="flex w-5 justify-center" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-soft px-3 py-4 text-center">
      <div className="text-3xl" aria-hidden>
        {emoji}
      </div>
      <p className="font-bold">{title}</p>
      {children}
    </div>
  );
}

/** Editable list of labelled options (used by the spinner and choice picker). */
export function OptionListEditor({
  options,
  onChange,
  label,
  min = 2,
  max = 24,
  newId,
}: {
  options: { id: string; label: string }[];
  onChange: (o: { id: string; label: string }[]) => void;
  label: string;
  min?: number;
  max?: number;
  newId: () => string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || options.length >= max) return;
    onChange([...options, { id: newId(), label: v.slice(0, 40) }]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5" aria-label={label}>
        {options.map((o, i) => (
          <li key={o.id} className="flex items-center gap-1.5">
            <span className="w-5 text-right text-xs font-bold text-ink-soft">{i + 1}</span>
            <input
              className={cx(inputCls, "min-h-10")}
              value={o.label}
              aria-label={`Option ${i + 1}`}
              maxLength={40}
              onChange={(e) => onChange(options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
            />
            <IconButton label={`Remove ${o.label || `option ${i + 1}`}`} disabled={options.length <= min} onClick={() => onChange(options.filter((x) => x.id !== o.id))}>
              <X size={18} />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an option…" aria-label="New option" maxLength={40} />
        <Button type="submit" variant="accent" disabled={!draft.trim() || options.length >= max}>
          Add
        </Button>
      </form>
      <p className="text-xs text-ink-soft">
        {options.length} options · between {min} and {max}
      </p>
    </div>
  );
}

export function Confetti({ burst }: { burst: number }) {
  const [pieces, setPieces] = useState<{ id: number; dx: number; dy: number; color: string; left: number }[]>([]);
  useEffect(() => {
    if (!burst) return;
    const colors = ["#e5484d", "#f5b700", "#2bb673", "#0c8ce9", "#8e4ec6", "#d6409f"];
    setPieces(
      Array.from({ length: 28 }, (_, i) => ({
        id: burst * 100 + i,
        dx: (Math.random() - 0.5) * 260,
        dy: -60 - Math.random() * 160,
        color: colors[i % colors.length],
        left: 40 + Math.random() * 20,
      })),
    );
    const t = setTimeout(() => setPieces([]), 1700);
    return () => clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} className="confetti-piece" style={{ left: `${p.left}%`, top: "60%", background: p.color, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px` }} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Prompt */

export function usePrompt() {
  const [state, setState] = useState<{ title: string; label: string; value: string; confirmLabel: string; resolve: (v: string | null) => void } | null>(null);
  const ask = useCallback(
    (title: string, label: string, initial = "", confirmLabel = "Save") =>
      new Promise<string | null>((resolve) => setState({ title, label, value: initial, confirmLabel, resolve })),
    [],
  );
  const close = (v: string | null) => {
    state?.resolve(v);
    setState(null);
  };
  const element = (
    <Modal
      open={!!state}
      onClose={() => close(null)}
      title={state?.title}
      footer={
        <>
          <Button variant="outline" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button variant="primary" form="prompt-form" type="submit" disabled={!state?.value.trim()}>
            {state?.confirmLabel}
          </Button>
        </>
      }
    >
      <form
        id="prompt-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (state?.value.trim()) close(state.value.trim());
        }}
      >
        <Field label={state?.label ?? ""}>
          <input
            data-autofocus
            className={inputCls}
            value={state?.value ?? ""}
            maxLength={60}
            onChange={(e) => setState((s) => (s ? { ...s, value: e.target.value } : s))}
          />
        </Field>
      </form>
    </Modal>
  );
  return [element, ask] as const;
}
