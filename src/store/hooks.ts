"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import type { ClassRoom, WidgetInstance } from "@/lib/types";
import { useSidekick, type Signal, type SidekickState } from "./store";

export function useWidget(id: string): WidgetInstance | undefined {
  return useSidekick((s) => s.widgets[id]);
}

export function useConfig<T>(id: string): [T, (patch: Partial<T>) => void] {
  const config = useSidekick((s) => s.widgets[id]?.config) as T;
  const update = (patch: Partial<T>) => useSidekick.getState().updateConfig(id, patch as Record<string, unknown>);
  return [config, update];
}

export function useSession<T>(id: string): [T | undefined, (v: T | undefined | ((p: T | undefined) => T | undefined)) => void] {
  const session = useSidekick((s) => s.sessions[id]) as T | undefined;
  const setter = (v: T | undefined | ((p: T | undefined) => T | undefined)) => useSidekick.getState().setSession<T>(id, v);
  return [session, setter];
}

export function useActiveClass(): ClassRoom | null {
  return useSidekick((s) => s.classes.find((c) => c.id === s.activeClassId) ?? null);
}

/**
 * Select derived plain data (e.g. a list of {id, name}) with value equality, so a selector that
 * builds new objects doesn't cause re-render loops. Use only for small, JSON-safe values.
 */
export function useSelectValue<T>(selector: (s: SidekickState) => T): T {
  const cache = useRef<{ key: string; val: T } | null>(null);
  return useSidekick((s) => {
    const val = selector(s);
    const key = JSON.stringify(val);
    if (cache.current && cache.current.key === key) return cache.current.val;
    cache.current = { key, val };
    return val;
  });
}

export function useClassList() {
  return useSelectValue((s) => s.classes.map((c) => ({ id: c.id, name: c.name })));
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}

export function useReducedMotion(): boolean {
  const pref = useSidekick((s) => s.prefs.reducedMotion);
  const system = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return pref === "on" || (pref === "system" && system);
}

/** Run `handler` whenever an action (dock, Quick Find, routine) signals this widget. */
export function useSignal(widgetId: string, handler: (sig: Signal) => void) {
  const sig = useSidekick((s) => s.signals[widgetId]);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!sig) return;
    useSidekick.getState().consumeSignal(widgetId);
    ref.current(sig);
  }, [sig, widgetId]);
}

/** Re-render on an interval (local to the calling component only). */
export function useNow(intervalMs: number, active = true): number {
  return useSyncExternalStore(
    (cb) => {
      if (!active) return () => {};
      const t = setInterval(cb, intervalMs);
      return () => clearInterval(t);
    },
    () => (active ? Math.floor(Date.now() / intervalMs) * intervalMs : 0),
    () => 0,
  );
}
