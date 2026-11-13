import type { FC } from "react";
import type { WidgetSize } from "@/lib/types";

export interface WidgetProps {
  id: string;
  view: "normal" | "expanded";
  size: WidgetSize;
}

export interface WidgetModule {
  Body: FC<WidgetProps>;
  /** Widget-specific settings shown in "More Settings". */
  Settings?: FC<{ id: string }>;
  /** Shown in the header while collapsed (e.g. remaining time). */
  Mini?: FC<{ id: string }>;
}
