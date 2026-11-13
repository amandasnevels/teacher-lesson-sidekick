"use client";
import { Minimize2 } from "lucide-react";
import { useSidekick } from "@/store/store";
import { DEFINITIONS } from "@/widgets/definitions";
import { WIDGET_MODULES } from "@/widgets/registry";
import { Modal } from "./ui";
import { accentStyle } from "./WidgetFrame";

/** Temporary large view. The widget keeps its place and preferred size in the workspace. */
export function ExpandedOverlay() {
  const id = useSidekick((s) => s.expandedWidgetId);
  const w = useSidekick((s) => (id ? s.widgets[id] : undefined));
  const close = () => useSidekick.getState().expandWidget(null);
  if (!id || !w) return null;
  const def = DEFINITIONS[w.type];
  const Mod = WIDGET_MODULES[w.type];
  return (
    <Modal open onClose={close} wide title={<span className="flex items-center gap-2">{def.emoji} {w.title || def.name}<span className="sr-only"> (expanded)</span></span>}>
      <div className="widget-card widget-body pb-2" style={accentStyle(w.color)}>
        <Mod.Body id={id} view="expanded" size="L" />
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold text-ink-soft hover:bg-black/5">
          <Minimize2 size={16} /> Return to workspace
        </button>
      </div>
    </Modal>
  );
}
