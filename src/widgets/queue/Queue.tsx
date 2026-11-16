"use client";
import { useId, useState } from "react";
import { ChevronRight, RotateCcw, X } from "lucide-react";
import { useActiveClass, useSession } from "@/store/hooks";
import { uid } from "@/lib/ids";
import { Button, IconButton, inputCls, cx } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";

interface QItem {
  id: string;
  name: string;
}
interface QueueSession {
  queue: QItem[];
  now: QItem | null;
}
/** Each class keeps its own turn order ("none" = no class selected). */
interface QueueStore extends Partial<QueueSession> {
  byClass?: Record<string, QueueSession>;
}

function Body({ id, view }: WidgetProps) {
  const [store, setStore] = useSession<QueueStore>(id);
  const cls = useActiveClass();
  const [draft, setDraft] = useState("");
  const listId = useId();
  const key = cls?.id ?? "none";
  // Older saves kept one queue for everyone: show it until this class makes its own.
  const legacy: QueueSession | null = store?.queue ? { queue: store.queue, now: store.now ?? null } : null;
  const q: QueueSession = store?.byClass?.[key] ?? legacy ?? { queue: [], now: null };
  const setS = (next: QueueSession) => setStore({ byClass: { ...(store?.byClass ?? {}), [key]: next } });
  const add = () => {
    const name = draft.trim().slice(0, 60);
    if (!name) return;
    setS({ ...q, queue: [...q.queue, { id: uid("q"), name }] });
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-soft px-3 py-3 text-center" aria-live="polite">
        <p className="text-xs font-black uppercase tracking-wide text-ink-soft">Now</p>
        <p className={cx("font-black", view === "expanded" ? "text-6xl" : "text-2xl")} data-testid="queue-now">{q.now?.name ?? "—"}</p>
        {q.queue[0] && <p className="text-sm font-semibold text-ink-soft">Next: {q.queue[0].name}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="accent" className="flex-1" disabled={q.queue.length === 0} onClick={() => setS({ queue: q.queue.slice(1), now: q.queue[0] ?? null })}>
          Next <ChevronRight size={18} />
        </Button>
        <IconButton label="Reset queue" variant="outline" onClick={() => setS({ queue: [], now: null })}>
          <RotateCcw size={16} />
        </IconButton>
      </div>
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className={inputCls} list={listId} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a name…" aria-label="Add to queue" />
        <datalist id={listId}>{cls?.students.map((st) => <option key={st.id} value={st.name} />)}</datalist>
        <Button type="submit" variant="soft" disabled={!draft.trim()}>Add</Button>
      </form>
      <ol className="space-y-1">
        {q.queue.map((item, i) => (
          <li key={item.id} className="flex items-center gap-2 rounded-xl bg-soft/60 px-2">
            <span className="w-5 text-xs font-black text-ink-soft">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
            <IconButton label={`Remove ${item.name}`} size="sm" onClick={() => setS({ ...q, queue: q.queue.filter((x) => x.id !== item.id) })}>
              <X size={14} />
            </IconButton>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [s] = useSession<QueueSession>(id);
  return <span className="text-xs font-bold">{s?.now?.name ?? `${s?.queue.length ?? 0} waiting`}</span>;
}

const QueueWidget: WidgetModule = { Body, Mini };
export default QueueWidget;
