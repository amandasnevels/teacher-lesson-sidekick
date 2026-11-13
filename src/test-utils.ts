import { useSidekick } from "@/store/store";
import { createDefaultState } from "@/store/defaults";
import type { PersistedState, WidgetType } from "@/lib/types";

/** Reset the store to a known state with an empty single workspace. */
export function resetStore(overrides: Partial<PersistedState> = {}) {
  const base = createDefaultState();
  const ws = { id: "ws1", name: "Test", widgetIds: [] as string[] };
  useSidekick.setState({
    ...base,
    workspaces: [ws],
    activeWorkspaceId: "ws1",
    widgets: {},
    sessions: {},
    dock: [],
    ...overrides,
    hydrated: true,
    toasts: [],
    undoStack: [],
    signals: {},
    expandedWidgetId: null,
    lastTimerId: null,
  });
}

export const S = () => useSidekick.getState();

export function addClassWith(name: string, students: string[]) {
  const id = S().addClass(name);
  S().addStudents(id, students);
  return id;
}

export function add(type: WidgetType, config?: Record<string, unknown>) {
  return S().addWidget(type, config ? { config } : {});
}
