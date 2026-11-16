"use client";
import { memo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  ChevronDown,
  Copy,
  GripVertical,
  Lock,
  LockOpen,
  Maximize2,
  MoreHorizontal,
  Palette,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { useSelectValue } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { useWidget } from "@/store/hooks";
import { COLOR_KEYS, WIDGET_COLORS, colorOf } from "@/lib/colors";
import { DEFINITIONS } from "@/widgets/definitions";
import { WIDGET_MODULES } from "@/widgets/registry";
import { preferredSpan } from "@/lib/layout";
import { Button, Field, IconButton, MenuItem, Modal, Popover, Segmented, cx, inputCls, usePrompt } from "./ui";

export interface HandleProps {
  ref: (el: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  dragging: boolean;
}

export interface ResizeProps {
  enabled: boolean;
  resizing: boolean;
  /** Card height in px, or null to fit content. */
  height: number | null;
  /** Live size badge while dragging. */
  label: string | null;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, corner: "left" | "right") => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  onReset: () => void;
}

function ResizeGrip({ corner, title, resize }: { corner: "left" | "right"; title: string; resize: ResizeProps }) {
  const right = corner === "right";
  return (
    <button
      type="button"
      aria-label={`Resize ${title} from the bottom-${corner} corner. Arrow keys change width and height; Home or double-click resets height.`}
      title="Drag to resize · double-click to reset height"
      data-testid={`resize-${corner}`}
      onPointerDown={(e) => resize.onPointerDown(e, corner)}
      onKeyDown={resize.onKeyDown}
      onDoubleClick={resize.onReset}
      className={cx(
        "absolute bottom-0 z-10 flex h-7 w-7 touch-none items-end p-1 text-ink-soft opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:opacity-70",
        right ? "right-0 cursor-nwse-resize justify-end rounded-br-3xl" : "left-0 cursor-nesw-resize justify-start rounded-bl-3xl",
        resize.resizing && "opacity-100",
      )}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={right ? "" : "-scale-x-100"}>
        <path d="M11 3 L3 11 M11 7 L7 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function accentStyle(color: string): CSSProperties {
  const c = colorOf(color);
  // Translucent tint (hex alpha) instead of color-mix(), which older Chromebooks lack.
  return { ["--accent" as string]: c.accent, ["--on-accent" as string]: c.ink, ["--soft" as string]: `${c.accent}24` };
}

export const WidgetFrame = memo(function WidgetFrame({ id, handle, resize }: { id: string; handle?: HandleProps; resize?: ResizeProps }) {
  const w = useWidget(id);
  const expanded = useSidekick((s) => s.expandedWidgetId === id);
  const flashing = useSidekick((s) => s.flashWidgetId === id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [promptEl, ask] = usePrompt();
  if (!w) return null;
  const def = DEFINITIONS[w.type];
  const mod = WIDGET_MODULES[w.type];
  const title = w.title || def.name;
  const s = useSidekick.getState;
  const closeMenu = () => {
    setMenuOpen(false);
    setShowColors(false);
  };

  const saveFavorite = async () => {
    closeMenu();
    const name = await ask("Save as Favorite", "Favorite name", `${title}`, "Save Favorite");
    if (name && s().saveFavorite(id, name)) s().toast({ message: `⭐ Saved “${name}” to Favorites`, tone: "success" });
  };

  return (
    <section
      aria-label={title}
      data-testid={`widget-${w.type}`}
      data-widget-type={w.type}
      className={cx(
        "widget-card relative rounded-3xl border border-line bg-card shadow-[0_2px_0_rgba(0,0,0,.04),0_6px_18px_-8px_rgba(30,40,80,.25)]",
        flashing && "flash",
        handle?.dragging && "shadow-2xl ring-4 ring-[var(--accent)]",
        resize?.resizing && "ring-4 ring-[var(--accent)]",
        resize?.height != null && "flex flex-col",
      )}
      style={{ ...accentStyle(w.color), height: resize?.height ?? undefined }}
      data-height={resize?.height ?? ""}
    >
      {promptEl}
      <div className={cx("flex items-center gap-1 rounded-t-3xl bg-soft py-1 pl-1 pr-1", w.collapsed && "rounded-b-3xl")}>
        {w.locked ? (
          <span className="flex h-10 w-8 items-center justify-center text-ink-soft" title="Locked in place" aria-label={`${title} is locked`}>
            <Lock size={16} />
          </span>
        ) : (
          <button
            type="button"
            ref={handle?.ref}
            {...handle?.attributes}
            {...handle?.listeners}
            aria-label={`Drag to move ${title}`}
            aria-roledescription="drag handle"
            className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-soft hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10"
            data-testid="drag-handle"
          >
            <GripVertical size={18} />
          </button>
        )}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm" aria-hidden>
          {def.emoji}
        </span>
        <h2 className="min-w-[3.5rem] flex-1 truncate pl-1 text-[15px] font-extrabold">{title}</h2>
        {w.collapsed && mod.Mini && (
          <span className="min-w-0 shrink">
            <mod.Mini id={id} />
          </span>
        )}
        <IconButton
          label={w.collapsed ? `Expand ${title} card` : `Collapse ${title}`}
          aria-expanded={!w.collapsed}
          size="md"
          onClick={() => s().updateWidget(id, { collapsed: !w.collapsed })}
        >
          <ChevronDown size={18} className={cx("transition-transform", w.collapsed && "-rotate-90")} />
        </IconButton>
        <IconButton ref={moreRef} label={`More options for ${title}`} size="md" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <MoreHorizontal size={18} />
        </IconButton>
      </div>

      {!w.collapsed && (
        <div className={cx("widget-body p-3", resize?.enabled && "pb-6", resize?.height != null && "min-h-0 flex-1 overflow-y-auto")}>
          {expanded ? (
            <div className="flex flex-col items-center gap-2 py-3 text-center text-sm text-ink-soft">
              Showing in expanded view
              <Button size="sm" variant="outline" onClick={() => s().expandWidget(null)}>
                Return here
              </Button>
            </div>
          ) : (
            <mod.Body id={id} view="normal" size={w.size} />
          )}
        </div>
      )}

      <Popover anchor={moreRef.current} open={menuOpen} onClose={closeMenu} label={`${title} options`}>
        {showColors ? (
          <div className="p-1">
            <p className="px-2 pb-1 text-xs font-bold uppercase text-ink-soft">Widget color</p>
            <div className="grid grid-cols-6 gap-1.5 p-1" role="group" aria-label="Widget colors">
              {COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="menuitemradio"
                  aria-checked={w.color === k}
                  aria-label={WIDGET_COLORS[k].label}
                  title={WIDGET_COLORS[k].label}
                  onClick={() => {
                    s().updateWidget(id, { color: k });
                    closeMenu();
                  }}
                  className={cx("h-9 w-9 rounded-full border-4", w.color === k ? "border-ink" : "border-transparent")}
                  style={{ background: WIDGET_COLORS[k].accent }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 px-2 pb-1 pt-0.5" role="group" aria-label="Widget size">
              <span className="mr-auto text-xs font-black uppercase text-ink-soft">Size</span>
              {([
                ["S", 1, "Small"],
                ["M", 2, "Medium"],
                ["L", 3, "Large"],
              ] as const).map(([key, cols, name]) => {
                const current = preferredSpan(w.w, w.size) === cols && w.h == null;
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={current}
                    aria-label={`${name} size`}
                    title={`${name}: ${cols} column${cols === 1 ? "" : "s"} wide, height fits content`}
                    onClick={() => {
                      s().pushUndo("Resize widget", ["widgets"]);
                      s().updateWidget(id, { size: key, w: cols, h: null });
                    }}
                    className={cx("flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black transition", current ? "bg-accent text-on-accent" : "bg-black/5 hover:bg-black/10 dark:bg-white/10")}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
            <MenuItem icon={<Copy size={16} />} onSelect={() => { closeMenu(); const nid = s().duplicateWidget(id); if (nid) s().flashWidget(nid); }}>
              Duplicate
            </MenuItem>
            <MenuItem icon={<Star size={16} />} onSelect={saveFavorite}>
              Save Favorite
            </MenuItem>
            <MenuItem icon={<Palette size={16} />} onSelect={() => setShowColors(true)}>
              Change Color
            </MenuItem>
            <MenuItem icon={w.locked ? <LockOpen size={16} /> : <Lock size={16} />} onSelect={() => { closeMenu(); s().updateWidget(id, { locked: !w.locked }); }}>
              {w.locked ? "Unlock" : "Lock"}
            </MenuItem>
            <MenuItem icon={<Maximize2 size={16} />} onSelect={() => { closeMenu(); s().expandWidget(id); }}>
              Expand
            </MenuItem>
            <MenuItem icon={<Trash2 size={16} />} danger onSelect={() => { closeMenu(); s().removeWidget(id); }}>
              Remove
            </MenuItem>
            <MenuItem icon={<Settings2 size={16} />} onSelect={() => { closeMenu(); setSettingsOpen(true); }}>
              More Settings
            </MenuItem>
          </>
        )}
      </Popover>

      {resize?.enabled && (
        <>
          <ResizeGrip corner="left" title={title} resize={resize} />
          <ResizeGrip corner="right" title={title} resize={resize} />
        </>
      )}
      {resize?.label && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-card shadow" role="status" data-testid="resize-badge">
          {resize.label}
        </span>
      )}
      {settingsOpen && <WidgetSettingsDialog id={id} onClose={() => setSettingsOpen(false)} onFavorite={saveFavorite} />}
    </section>
  );
});

function WidgetSettingsDialog({ id, onClose, onFavorite }: { id: string; onClose: () => void; onFavorite: () => void }) {
  const w = useWidget(id)!;
  const def = DEFINITIONS[w.type];
  const mod = WIDGET_MODULES[w.type];
  const s = useSidekick.getState;
  const workspaces = useSelectValue((st) => st.workspaces.map((x) => ({ id: x.id, name: x.name })));
  const [target, setTarget] = useState(workspaces.find((x) => x.id !== w.workspaceId)?.id ?? "");
  return (
    <Modal open onClose={onClose} title={`${def.emoji} ${w.title || def.name} settings`} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="space-y-4" style={accentStyle(w.color)}>
        <Field label="Title">
          <input className={inputCls} value={w.title ?? ""} placeholder={def.name} maxLength={40} onChange={(e) => s().updateWidget(id, { title: e.target.value })} />
        </Field>
        <Field label="Preferred width" hint="Tip: drag a widget's bottom corners to resize it. Narrow windows stack widgets without changing your preference.">
          <Segmented<number>
            label="Preferred width"
            value={preferredSpan(w.w, w.size)}
            onChange={(span) => s().updateWidget(id, { w: span })}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n} col${n === 1 ? "" : "s"}` }))}
          />
        </Field>
        <Field label="Height">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{w.h ? `${w.h}px` : "Fits content"}</span>
            {w.h != null && (
              <Button size="sm" variant="outline" onClick={() => s().updateWidget(id, { h: null })}>
                Fit content
              </Button>
            )}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-1.5">
            {COLOR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={WIDGET_COLORS[k].label}
                aria-pressed={w.color === k}
                onClick={() => s().updateWidget(id, { color: k })}
                className={cx("h-9 w-9 rounded-full border-4", w.color === k ? "border-ink" : "border-transparent")}
                style={{ background: WIDGET_COLORS[k].accent }}
              />
            ))}
          </div>
        </Field>
        {mod.Settings && (
          <div className="rounded-2xl border-2 border-line p-3">
            <mod.Settings id={id} />
          </div>
        )}
        <div className="space-y-2 rounded-2xl bg-black/[.03] p-3 dark:bg-white/5">
          <p className="text-xs font-bold uppercase text-ink-soft">Save & reuse</p>
          <Button variant="outline" size="sm" onClick={onFavorite}>
            <Star size={14} /> Save as Favorite
          </Button>
          {workspaces.length > 1 && (
            <div className="flex gap-1.5">
              <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Copy to workspace">
                {workspaces.filter((x) => x.id !== w.workspaceId).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={!target}
                onClick={() => {
                  if (s().copyWidgetToWorkspace(id, target)) s().toast({ message: `Copied to ${workspaces.find((x) => x.id === target)?.name}`, tone: "success" });
                }}
              >
                Copy
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
