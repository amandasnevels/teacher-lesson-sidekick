"use client";
import { useSidekick } from "@/store/store";
import { useActiveClass, useConfig } from "@/store/hooks";
import { Field, Segmented, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface NotesConfig {
  scope: "general" | "class";
  fontSize: "sm" | "md" | "lg";
  text: Record<string, string>;
}

const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };

function Body({ id, view }: WidgetProps) {
  const [c] = useConfig<NotesConfig>(id);
  const cls = useActiveClass();
  const key = c.scope === "class" ? cls?.id ?? "none" : "general";
  const text = c.text?.[key] ?? "";
  return (
    <div className="space-y-1">
      {c.scope === "class" && <p className="text-xs font-bold text-ink-soft">{cls ? `Notes for ${cls.name}` : "No class selected"}</p>}
      <textarea
        aria-label="Note text"
        className={cx(
          "w-full resize-y rounded-xl border-2 border-transparent bg-soft p-3 leading-snug text-ink focus:border-accent focus:outline-none",
          sizes[c.fontSize] ?? sizes.md,
          view === "expanded" ? "min-h-[50vh] text-2xl" : "min-h-28",
        )}
        value={text}
        maxLength={5000}
        placeholder="Type a note… it saves automatically."
        onChange={(e) => useSidekick.getState().updateConfig(id, (prev) => ({ ...prev, text: { ...((prev.text as Record<string, string>) ?? {}), [key]: e.target.value } }))}
      />
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<NotesConfig>(id);
  const first = Object.values(c.text ?? {}).find(Boolean) ?? "";
  return <span className="max-w-28 truncate text-xs text-ink-soft">{first.split("\n")[0]}</span>;
}

function Settings({ id }: { id: string }) {
  const [c, set] = useConfig<NotesConfig>(id);
  return (
    <div className="space-y-3">
      <Field label="Note belongs to" hint="Class notes show different text for each class.">
        <Segmented label="Note scope" value={c.scope} onChange={(scope) => set({ scope })} options={[{ value: "general", label: "Everyone" }, { value: "class", label: "Each class" }]} />
      </Field>
      <Field label="Text size">
        <Segmented label="Text size" value={c.fontSize} onChange={(fontSize) => set({ fontSize })} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      </Field>
    </div>
  );
}

const NotesWidget: WidgetModule = { Body, Mini, Settings };
export default NotesWidget;
