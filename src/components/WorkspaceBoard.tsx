"use client";
/**
 * The workspace: a free 2D grid (react-grid-layout). Teachers drag widgets by their handle to any
 * column and stack them under one another; other widgets move out of the way and pack upward.
 * Heights come from each widget's real content (measured), widths from its preferred size, clamped to
 * the columns that fit, so narrow windows never overwrite the saved arrangement.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { useShallow } from "zustand/react/shallow";
import { useSidekick } from "@/store/store";
import { useSelectValue } from "@/store/hooks";
import { MAX_SPAN, displaySpan, gridColumnsFor, preferredSpan, snapHeight, spanForWidth, type GridMetrics } from "@/lib/layout";
import { GAP_PX, ROW_PX, buildLayout, insertAt, readingOrder, rowsFor, type GridItem } from "@/lib/gridLayout";
import type { WidgetSize } from "@/lib/types";
import { Button, EmptyState } from "./ui";
import { WidgetFrame, type ResizeProps } from "./WidgetFrame";

const EMPTY: string[] = [];

/** Content scale for Medium / Large widgets (contents grow with the card). */
export const SCALE_BY_SPAN: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.4, 4: 1.5 };

function useGridMetrics(ref: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const metrics = useRef<GridMetrics>({ cols: 1, colWidth: 300, gap: GAP_PX });
  const [state, setState] = useState({ cols: 1, width: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const cols = gridColumnsFor(width, GAP_PX);
      metrics.current = { cols, colWidth: (width - GAP_PX * (cols - 1)) / cols, gap: GAP_PX };
      setState((s) => (s.cols === cols && s.width === width ? s : { cols, width }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, ready]);
  return { metrics, ...state };
}

interface Preview {
  id: string;
  span: number;
  h: number;
}

export function WorkspaceBoard() {
  const wsId = useSidekick((s) => s.activeWorkspaceId);
  const ids = useSidekick(useShallow((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.widgetIds ?? EMPTY));
  const gridRef = useRef<HTMLDivElement>(null);
  const { metrics, cols, width } = useGridMetrics(gridRef, ids.length > 0);
  const saved = useSidekick((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.layouts?.[String(cols)]);
  const info = useSelectValue((s) =>
    ids.map((id) => {
      const w = s.widgets[id];
      return { id, pref: preferredSpan(w?.w, w?.size as WidgetSize | undefined), locked: !!w?.locked };
    }),
  );
  const [rows, setRows] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  // No slide-in animation while the first measurements arrive (avoids a wobble on load / workspace switch).
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 600);
    return () => clearTimeout(t);
  }, [wsId]);

  const onHeight = useCallback((id: string, px: number) => {
    const r = rowsFor(px);
    setRows((prev) => (prev[id] === r ? prev : { ...prev, [id]: r }));
  }, []);

  const spanOf = useCallback(
    (id: string) => (preview?.id === id ? preview.span : displaySpan(info.find((x) => x.id === id)?.pref ?? 2, cols)),
    [info, cols, preview],
  );

  const layout = useMemo(
    () =>
      buildLayout(
        ids,
        saved,
        spanOf,
        (id) => rows[id] ?? 60,
        cols,
        (id) => !!info.find((x) => x.id === id)?.locked,
      ),
    [ids, saved, spanOf, rows, cols, info],
  );

  // Drag: we decide the drop spot ourselves (see insertAt), so it depends only on where the pointer is.
  const dragStart = useRef<GridItem[] | null>(null);
  const lastRow = useRef(0);
  const pointerRow = (e: Event | undefined) => {
    const t = e as (MouseEvent & TouchEvent) | undefined;
    const clientY = t?.touches?.[0]?.clientY ?? t?.changedTouches?.[0]?.clientY ?? t?.clientY;
    const top = gridRef.current?.getBoundingClientRect().top ?? 0;
    if (typeof clientY === "number") lastRow.current = Math.max(0, (clientY - top) / ROW_PX);
    return lastRow.current;
  };
  const applyDrop = (l: Layout[], item: Layout, e: Event | undefined, placeholder?: Layout | null) => {
    const start = dragStart.current;
    if (!start) return null;
    const next = insertAt(start, item.i, Math.min(item.x, cols - item.w), pointerRow(e));
    const byId = new Map(next.map((n) => [n.i, n]));
    // react-grid-layout renders the layout objects it hands us, so update them in place.
    for (const it of l) {
      const n = byId.get(it.i);
      if (n) {
        it.x = n.x;
        it.y = n.y;
      }
    }
    const d = byId.get(item.i);
    if (placeholder && d) {
      placeholder.x = d.x;
      placeholder.y = d.y;
    }
    return next;
  };

  const save = (l: Layout[]) => {
    const st = useSidekick.getState();
    st.pushUndo("Move widget", ["workspaces"]);
    st.setWorkspaceLayout(
      wsId,
      cols,
      l.map(({ i, x, y }) => ({ i, x, y })),
      readingOrder(l),
    );
  };

  /** Keyboard alternative to dragging: swap with the previous / next widget in reading order. */
  const moveByKey = (id: string, dir: -1 | 1) => {
    const order = readingOrder(layout);
    const idx = order.indexOf(id);
    const other = order[idx + dir];
    if (!other) return;
    const a = layout.find((l) => l.i === id)!;
    const b = layout.find((l) => l.i === other)!;
    const next = layout.map((l) =>
      l.i === id ? { ...l, x: Math.min(b.x, cols - l.w), y: b.y } : l.i === other ? { ...l, x: Math.min(a.x, cols - l.w), y: a.y } : l,
    );
    save(next as Layout[]);
  };

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-sm pt-6" ref={gridRef}>
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
    <div ref={gridRef} className={`widget-board-grid${animate ? " animate" : ""}`} data-testid="widget-grid" data-cols={cols}>
      {width > 0 && (
        <GridLayout
          layout={layout}
          cols={cols}
          width={width}
          rowHeight={ROW_PX}
          margin={[GAP_PX, 0]}
          containerPadding={[0, 0]}
          compactType="vertical"
          isResizable={false}
          draggableHandle=".widget-drag-handle"
          onDragStart={(l, item, _n, _p, e) => {
            dragStart.current = l.map((x) => ({ i: x.i, x: x.x, y: x.y, w: x.w, h: x.h, static: x.static }));
            pointerRow(e as unknown as Event);
            setDragging(item.i);
          }}
          onDrag={(l, _old, item, placeholder, e) => {
            applyDrop(l, item, e as unknown as Event, placeholder);
          }}
          onDragStop={(l, _old, item, _p, e) => {
            const start = dragStart.current;
            const next = applyDrop(l, item, e as unknown as Event);
            dragStart.current = null;
            setDragging(null);
            if (start && next && next.some((n) => { const s0 = start.find((x) => x.i === n.i); return !s0 || s0.x !== n.x || s0.y !== n.y; })) save(next as Layout[]);
          }}
        >
          {ids.map((id) => {
            const span = spanOf(id);
            return (
              <div key={id} data-widget-id={id} data-span={span}>
                <GridWidget
                  id={id}
                  span={span}
                  cols={cols}
                  metrics={metrics}
                  dragging={dragging === id}
                  onHeight={onHeight}
                  setPreview={setPreview}
                  onMove={(dir) => moveByKey(id, dir)}
                />
              </div>
            );
          })}
        </GridLayout>
      )}
    </div>
  );
}

function GridWidget({
  id,
  span,
  cols,
  metrics,
  dragging,
  onHeight,
  setPreview,
  onMove,
}: {
  id: string;
  span: number;
  cols: number;
  metrics: React.RefObject<GridMetrics>;
  dragging: boolean;
  onHeight: (id: string, px: number) => void;
  setPreview: (p: Preview | null) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const locked = useSidekick((s) => !!s.widgets[id]?.locked);
  const collapsed = useSidekick((s) => !!s.widgets[id]?.collapsed);
  const size = useSidekick((s) => s.widgets[id]?.size ?? "M");
  const w = useSidekick((s) => s.widgets[id]?.w ?? null);
  const h = useSidekick((s) => s.widgets[id]?.h ?? null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [localPreview, setLocalPreview] = useState<{ span: number; h: number } | null>(null);
  const pref = preferredSpan(w, size);

  // Measure the card so the grid row span always matches the real content height.
  useLayoutEffect(() => {
    const card = boxRef.current?.querySelector("section");
    if (!card) return;
    const measure = () => onHeight(id, card.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    return () => ro.disconnect();
  }, [id, onHeight]);

  useEffect(() => () => setPreview(null), [setPreview]);

  const height = collapsed ? null : localPreview ? localPreview.h : h;

  const commit = (next: { span: number; h: number }, moved: { x: boolean; y: boolean }) => {
    const st = useSidekick.getState();
    const patch: { w?: number; h?: number; size?: WidgetSize } = {};
    if (moved.x && next.span !== displaySpan(pref, cols)) {
      patch.w = next.span;
      patch.size = next.span <= 1 ? "S" : next.span === 2 ? "M" : "L";
    }
    if (moved.y) patch.h = next.h;
    if (Object.keys(patch).length) {
      st.pushUndo("Resize widget", ["widgets"]);
      st.updateWidget(id, patch);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, corner: "left" | "right") => {
    if (locked || e.button > 0) return;
    const card = boxRef.current?.querySelector("section");
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const startW = card.getBoundingClientRect().width;
    const startH = card.getBoundingClientRect().height;
    const sx = e.clientX;
    const sy = e.clientY;
    let cur = { span, h: snapHeight(startH) };
    const moved = { x: false, y: false };
    const show = (p: typeof cur) => {
      setLocalPreview(p);
      setPreview({ id, ...p });
    };
    show(cur);
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) * (corner === "left" ? -1 : 1);
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 6) moved.x = true;
      if (Math.abs(dy) > 4) moved.y = true;
      cur = { span: moved.x ? spanForWidth(startW + dx, metrics.current) : span, h: moved.y ? snapHeight(startH + dy) : cur.h };
      show(cur);
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      setLocalPreview(null);
      setPreview(null);
      commit(cur, moved);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const onResizeKey = (e: KeyboardEvent<HTMLElement>) => {
    if (locked) return;
    const st = useSidekick.getState();
    const cardH = boxRef.current?.querySelector("section")?.getBoundingClientRect().height ?? 300;
    const maxSpan = Math.max(1, Math.min(MAX_SPAN, cols));
    let patch: { w?: number; h?: number | null; size?: WidgetSize } | null = null;
    const sized = (n: number) => ({ w: n, size: (n <= 1 ? "S" : n === 2 ? "M" : "L") as WidgetSize });
    if (e.key === "ArrowRight") patch = sized(Math.min(maxSpan, span + 1));
    else if (e.key === "ArrowLeft") patch = sized(Math.max(1, span - 1));
    else if (e.key === "ArrowDown") patch = { h: snapHeight((h ?? cardH) + 40) };
    else if (e.key === "ArrowUp") patch = { h: snapHeight((h ?? cardH) - 40) };
    else if (e.key === "Home") patch = { h: null };
    if (!patch) return;
    e.preventDefault();
    st.pushUndo("Resize widget", ["widgets"]);
    st.updateWidget(id, patch);
  };

  const onHandleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (locked) return;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onMove(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onMove(1);
    }
  };

  const resize: ResizeProps = {
    enabled: !locked && !collapsed,
    resizing: !!localPreview,
    height,
    label: localPreview ? `${localPreview.span} col${localPreview.span === 1 ? "" : "s"} · ${localPreview.h}px` : null,
    onPointerDown,
    onKeyDown: onResizeKey,
    onReset: () => {
      useSidekick.getState().pushUndo("Resize widget", ["widgets"]);
      useSidekick.getState().updateWidget(id, { h: null });
    },
  };

  return (
    <div ref={boxRef} className="h-full min-w-0" data-size={size}>
      <WidgetFrame id={id} handle={{ onKeyDown: onHandleKey, dragging }} resize={resize} scale={SCALE_BY_SPAN[Math.min(4, span)] ?? 1} />
    </div>
  );
}
