"use client";
import type { CSSProperties } from "react";
import { useSidekick } from "@/store/store";
import { Header } from "./Header";
import { WorkspaceBoard } from "./WorkspaceBoard";
import { SideBySideBanner } from "./SideBySide";
import { QuickDock } from "./QuickDock";
import { WidgetLibrary } from "./WidgetLibrary";
import { QuickFind } from "./QuickFind";
import { SettingsPanel } from "./SettingsPanel";
import { RoutineEditor } from "./RoutineEditor";
import { ExpandedOverlay } from "./ExpandedOverlay";
import { Toasts } from "./Toasts";

const LAYOUTS: Record<string, CSSProperties> = {
  bottom: { gridTemplateAreas: '"header" "main" "dock"', gridTemplateRows: "auto minmax(0,1fr) auto", gridTemplateColumns: "minmax(0,1fr)" },
  top: { gridTemplateAreas: '"header" "dock" "main"', gridTemplateRows: "auto auto minmax(0,1fr)", gridTemplateColumns: "minmax(0,1fr)" },
  left: { gridTemplateAreas: '"header header" "dock main"', gridTemplateRows: "auto minmax(0,1fr)", gridTemplateColumns: "auto minmax(0,1fr)" },
  right: { gridTemplateAreas: '"header header" "main dock"', gridTemplateRows: "auto minmax(0,1fr)", gridTemplateColumns: "minmax(0,1fr) auto" },
};

export function AppShell() {
  const dock = useSidekick((s) => s.prefs.dockPosition);
  return (
    <div className="grid h-screen-safe w-full overflow-clip" style={LAYOUTS[dock] ?? LAYOUTS.bottom} data-dock={dock}>
      <a href="#workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-2">
        Skip to widgets
      </a>
      <div style={{ gridArea: "header" }}>
        <Header />
      </div>
      <main id="workspace" style={{ gridArea: "main" }} className="widget-board min-h-0 overflow-y-auto overflow-x-hidden px-2.5 pb-6 pt-2.5 sm:px-4" tabIndex={-1}>
        <SideBySideBanner />
        <WorkspaceBoard />
      </main>
      <div style={{ gridArea: "dock" }} className="min-h-0 min-w-0">
        <QuickDock />
      </div>
      <WidgetLibrary />
      <QuickFind />
      <SettingsPanel />
      <RoutineEditor />
      <ExpandedOverlay />
      <Toasts />
    </div>
  );
}
