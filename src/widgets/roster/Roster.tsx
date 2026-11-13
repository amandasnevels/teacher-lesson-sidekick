"use client";
import { RosterManager } from "@/components/RosterManager";
import type { WidgetModule } from "../types";

const RosterWidget: WidgetModule = {
  Body: () => <RosterManager compact />,
};
export default RosterWidget;
