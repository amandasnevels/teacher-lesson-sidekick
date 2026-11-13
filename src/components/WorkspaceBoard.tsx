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
import { useShallow } from "zustand/react/shallow";
import { useSidekick } from "@/store/store";
import { Button, EmptyState } from "./ui";
import { WidgetFrame } from "./WidgetFrame";

const EMPTY: string[] = [];

export function WorkspaceBoard() {
  const wsId = useSidekick((s) => s.activeWorkspaceId);
  const ids = useSidekick(useShallow((s) => s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.widgetIds ?? EMPTY));
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
        <div className="widget-grid" data-testid="widget-grid">
          {ids.map((id) => (
            <SortableWidget key={id} id={id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableWidget({ id }: { id: string }) {
  const locked = useSidekick((s) => !!s.widgets[id]?.locked);
  const size = useSidekick((s) => s.widgets[id]?.size ?? "M");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });
  return (
    <div
      ref={setNodeRef}
      data-size={size}
      data-widget-id={id}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.85 : 1 }}
      className="min-w-0"
    >
      <WidgetFrame id={id} handle={{ ref: setActivatorNodeRef, attributes, listeners: locked ? undefined : listeners, dragging: isDragging }} />
    </div>
  );
}
