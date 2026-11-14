"use client";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSidekick } from "@/store/store";
import { MAX_SPAN, displaySpan, gridColumnsFor, preferredSpan, snapHeight, spanForWidth, type GridMetrics } from "@/lib/layout";
import { Button, EmptyState } from "./ui";
import { WidgetFrame, type ResizeProps } from "./WidgetFrame";

const MetricsContext = createContext<{ current: GridMetrics }>({ current: { cols: 1, colWidth: 300, gap: 12 } });
const ColsContext = createContext(1);

/** Track how many columns fit, so preferred widths are clamped for display only. */
function useGridMetrics(ref: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const metrics = useRef<GridMetrics>({ cols: 1, colWidth: 300, gap: 12 });
  const [cols, setCols] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Mirror the CSS `repeat(auto-fill, minmax(min(100%, 230px), 1fr))` from the width itself.
      // (Computed grid tracks also list implicit columns created by wide cards, which would feed back.)
      const gap = parseFloat(getComputedStyle(el).columnGap) || 12;
      const width = el.clientWidth;
      const n = gridColumnsFor(width, gap);
      const colWidth = (width - gap * (n - 1)) / n;
      metrics.current = { cols: n, colWidth, gap };
      setCols(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, ready]);
  return { metrics, cols };
}

const EMPTY: string[] = [];

export function WorkspaceBoard() {
  const wsId = useSidekick((s) => s.activeWorkspaceId);
  const ids = useSidekick(useShallow((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.widgetIds ?? EMPTY));
  const gridRef = useRef<HTMLDivElement>(null);
  const { metrics, cols } = useGridMetrics(gridRef, ids.length > 0);
  const sensors = useSensors(
    // Dragging only starts from the dedicated handle; a small distance avoids accidental drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    useSidekick.getState().setWidgetOrder(wsId, arrayMove(ids, from, to));
  };

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-sm pt-6">
        <EmptyState emoji="✨" title="This workspace is empty">
          <p className="text-sm text-ink-soft">Add the tools you need for this part of your day.</p>
          <Button variant="primary" onClick={() => useSidekick.getState().openLibrary("new")}>
            Add a widget
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: "To move a widget, press space or enter on its handle, use the arrow keys, then press space or enter to drop it." },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <MetricsContext.Provider value={metrics}>
          <ColsContext.Provider value={cols}>
            <div ref={gridRef} className="widget-grid" data-testid="widget-grid" data-cols={cols}>
              {ids.map((id) => (
                <SortableWidget key={id} id={id} />
              ))}
            </div>
          </ColsContext.Provider>
        </MetricsContext.Provider>
      </SortableContext>
    </DndContext>
  );
}

function SortableWidget({ id }: { id: string }) {
  const locked = useSidekick((s) => !!s.widgets[id]?.locked);
  const collapsed = useSidekick((s) => !!s.widgets[id]?.collapsed);
  const size = useSidekick((s) => s.widgets[id]?.size ?? "M");
  const w = useSidekick((s) => s.widgets[id]?.w ?? null);
  const h = useSidekick((s) => s.widgets[id]?.h ?? null);
  const cols = useContext(ColsContext);
  const metrics = useContext(MetricsContext);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<{ span: number; h: number } | null>(null);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked || !!preview });

  const pref = preferredSpan(w, size);
  const span = preview ? preview.span : displaySpan(pref, cols);
  const height = collapsed ? null : preview ? preview.h : h;

  const commit = (next: { span: number; h: number }, moved: { x: boolean; y: boolean }) => {
    const st = useSidekick.getState();
    const patch: { w?: number; h?: number } = {};
    // Only store what the teacher actually changed, so a narrow window never overwrites the preferred width.
    if (moved.x && next.span !== displaySpan(pref, cols)) patch.w = next.span;
    if (moved.y) patch.h = next.h;
    if (Object.keys(patch).length) {
      st.pushUndo("Resize widget", ["widgets"]);
      st.updateWidget(id, patch);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, corner: "left" | "right") => {
    if (locked || e.button > 0) return;
    const wrapper = wrapperRef.current;
    const card = wrapper?.querySelector("section");
    if (!wrapper || !card) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const startW = wrapper.getBoundingClientRect().width;
    const startH = card.getBoundingClientRect().height;
    const sx = e.clientX;
    const sy = e.clientY;
    let cur = { span, h: snapHeight(startH) };
    const moved = { x: false, y: false };
    setPreview(cur);
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) * (corner === "left" ? -1 : 1);
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 6) moved.x = true;
      if (Math.abs(dy) > 4) moved.y = true;
      cur = { span: moved.x ? spanForWidth(startW + dx, metrics.current) : span, h: moved.y ? snapHeight(startH + dy) : cur.h };
      setPreview(cur);
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      setPreview(null);
      commit(cur, moved);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (locked) return;
    const st = useSidekick.getState();
    const cardH = wrapperRef.current?.querySelector("section")?.getBoundingClientRect().height ?? 300;
    const maxSpan = Math.max(1, Math.min(MAX_SPAN, cols));
    let patch: { w?: number; h?: number | null } | null = null;
    if (e.key === "ArrowRight") patch = { w: Math.min(maxSpan, span + 1) };
    else if (e.key === "ArrowLeft") patch = { w: Math.max(1, span - 1) };
    else if (e.key === "ArrowDown") patch = { h: snapHeight((h ?? cardH) + 40) };
    else if (e.key === "ArrowUp") patch = { h: snapHeight((h ?? cardH) - 40) };
    else if (e.key === "Home") patch = { h: null };
    if (!patch) return;
    e.preventDefault();
    st.pushUndo("Resize widget", ["widgets"]);
    st.updateWidget(id, patch);
  };

  const resize: ResizeProps = {
    enabled: !locked && !collapsed,
    resizing: !!preview,
    height,
    label: preview ? `${preview.span} col${preview.span === 1 ? "" : "s"} · ${preview.h}px` : null,
    onPointerDown,
    onKeyDown,
    onReset: () => {
      useSidekick.getState().pushUndo("Resize widget", ["widgets"]);
      useSidekick.getState().updateWidget(id, { h: null });
    },
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        wrapperRef.current = el;
      }}
      data-size={size}
      data-span={span}
      data-widget-id={id}
      style={{
        gridColumn: `span ${span}`,
        transform: CSS.Translate.toString(transform),
        transition: preview ? undefined : transition,
        zIndex: isDragging || preview ? 20 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
      className="min-w-0"
    >
      <WidgetFrame id={id} handle={{ ref: setActivatorNodeRef, attributes, listeners: locked ? undefined : listeners, dragging: isDragging }} resize={resize} />
    </div>
  );
}
