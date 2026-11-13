"use client";
import { useEffect, useRef, useState } from "react";
import { Pencil, Shuffle } from "lucide-react";
import { useConfig, useReducedMotion, useSession, useSignal } from "@/store/hooks";
import { randomInt } from "@/lib/random";
import { uid } from "@/lib/ids";
import { Button, OptionListEditor, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

type Opt = { id: string; label: string };
interface ChoiceConfig {
  options: Opt[];
}
interface ChoiceSession {
  resultId: string | null;
}

function Body({ id, view }: WidgetProps) {
  const [config, setConfig] = useConfig<ChoiceConfig>(id);
  const [session, setSession] = useSession<ChoiceSession>(id);
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const options = config.options ?? [];
  const result = options.find((o) => o.id === session?.resultId);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pick = () => {
    if (busy || options.length < 2) return;
    const final = options[randomInt(options.length)];
    if (reduced) {
      setHighlight(final.id);
      setSession({ resultId: final.id });
      return;
    }
    setBusy(true);
    setSession({ resultId: null });
    const steps = 16;
    let t = 0;
    let delay = 45;
    let idx = randomInt(options.length);
    for (let i = 0; i < steps; i++) {
      t += delay;
      delay *= 1.15;
      const last = i === steps - 1;
      idx = (idx + 1) % options.length;
      const hid = last ? final.id : options[idx].id;
      timers.current.push(
        setTimeout(() => {
          setHighlight(hid);
          if (last) {
            setSession({ resultId: final.id });
            setBusy(false);
          }
        }, t),
      );
    }
  };
  useSignal(id, (s) => s.name === "pick" && pick());

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Choices">
        {options.map((o) => (
          <li
            key={o.id}
            className={cx(
              "rounded-xl px-3 py-1.5 text-sm font-bold transition",
              (busy ? highlight === o.id : result?.id === o.id) ? "scale-110 bg-accent text-on-accent shadow" : "bg-soft",
            )}
          >
            {o.label}
          </li>
        ))}
      </ul>
      <p className={cx("min-h-9 text-center font-black", view === "expanded" ? "text-5xl" : "text-2xl", !busy && result && "pop-in")} aria-live="polite" data-testid="choice-result">
        {busy ? "Choosing…" : result?.label ?? " "}
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="accent" onClick={pick} disabled={busy || options.length < 2} className="min-w-28">
          <Shuffle size={18} /> Choose
        </Button>
        <Button variant="outline" onClick={() => setEditing(!editing)} aria-expanded={editing}>
          <Pencil size={16} /> {editing ? "Done" : "Edit"}
        </Button>
      </div>
      {editing && <OptionListEditor label="Choice options" options={options} onChange={(o) => setConfig({ options: o })} newId={() => uid("opt")} />}
    </div>
  );
}

function Settings({ id }: { id: string }) {
  const [config, setConfig] = useConfig<ChoiceConfig>(id);
  return <OptionListEditor label="Choice options" options={config.options ?? []} onChange={(options) => setConfig({ options })} newId={() => uid("opt")} />;
}

const ChoiceWidget: WidgetModule = { Body, Settings };
export default ChoiceWidget;
