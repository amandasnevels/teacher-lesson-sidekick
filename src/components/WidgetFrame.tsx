"use client";
import { memo, useRef, useState, type CSSProperties } from "react";
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
import type { WidgetSize } from "@/lib/types";
import { Button, Field, IconButton, MenuItem, Modal, Popover, Segmented, cx, inputCls, usePrompt } from "./ui";

export interface HandleProps {
  ref: (el: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  dragging: boolean;
}

export function accentStyle(color: string): CSSProperties {
  const c = colorOf(color);
  return { ["--accent" as string]: c.accent, ["--on-accent" as string]: c.ink };
}

export const WidgetFrame = memo(function WidgetFrame({ id, handle }: { id: string; handle?: HandleProps }) {
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
      )}
      style={accentStyle(w.color)}
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
        <div className="widget-body p-3">
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
        <Field label="Preferred size" hint="Used when the window is wide enough. Narrow windows stack widgets without changing this.">
          <Segmented<WidgetSize>
            label="Preferred size"
            value={w.size}
            onChange={(size) => s().updateWidget(id, { size })}
            options={[
              { value: "S", label: "Small" },
              { value: "M", label: "Medium" },
              { value: "L", label: "Large" },
            ]}
          />
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
