"use client";
import { useMemo, useState } from "react";
import { Anchor, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useSidekick, type LibraryTab } from "@/store/store";
import { ALL_TYPES, CATEGORIES, DEFINITIONS, PACKS, type WidgetCategory } from "@/widgets/definitions";
import { colorOf } from "@/lib/colors";
import type { WidgetType } from "@/lib/types";
import { Button, IconButton, Modal, Segmented, cx, inputCls, useConfirm } from "./ui";

function matches(type: WidgetType, q: string) {
  if (!q) return true;
  const d = DEFINITIONS[type];
  const hay = [d.name, d.description, d.category, ...d.keywords].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function WidgetLibrary() {
  const open = useSidekick((s) => s.library.open);
  const tab = useSidekick((s) => s.library.tab);
  const s = useSidekick.getState;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<WidgetCategory | "All">("All");
  const recent = useSidekick((st) => st.recentWidgetTypes);
  const favorites = useSidekick((st) => st.favorites);
  const removed = useSidekick(useShallow((st) => Object.values(st.widgets).filter((w) => w.removedAt).sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0))));
  const workspaces = useSidekick((st) => st.workspaces);
  const [confirmEl, ask] = useConfirm();

  const types = useMemo(() => ALL_TYPES.filter((t) => matches(t, q) && (cat === "All" || DEFINITIONS[t].category === cat)), [q, cat]);
  const close = () => s().closeLibrary();
  const setTab = (t: LibraryTab) => s().openLibrary(t);

  const addNew = (type: WidgetType) => {
    const id = s().addWidget(type);
    close();
    s().flashWidget(id);
    setTimeout(() => document.querySelector(`[data-widget-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <Modal open={open} onClose={close} title="Widget Library" wide>
      {confirmEl}
      <div className="space-y-3">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input className={cx(inputCls, "pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search widgets…" aria-label="Search widgets" data-autofocus />
        </label>
        <Segmented
          label="Library sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "new", label: "New" },
            { value: "favorites", label: `Favorites${favorites.length ? ` (${favorites.length})` : ""}` },
            { value: "removed", label: `Removed${removed.length ? ` (${removed.length})` : ""}` },
            { value: "packs", label: "Packs" },
          ]}
        />

        {tab === "new" && (
          <>
            {!q && recent.length > 0 && cat === "All" && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-soft">Recently used</p>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                  {recent.map((t) => (
                    <button key={t} type="button" onClick={() => addNew(t)} className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-black/5 px-3 text-sm font-bold hover:bg-black/10 dark:bg-white/10">
                      {DEFINITIONS[t].emoji} {DEFINITIONS[t].name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="no-scrollbar flex gap-1 overflow-x-auto" role="group" aria-label="Categories">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cx("min-h-9 shrink-0 rounded-full px-3 text-sm font-bold", cat === c ? "bg-brand text-brand-ink" : "bg-black/5 dark:bg-white/10")}>
                  {c}
                </button>
              ))}
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
              {types.map((t) => {
                const d = DEFINITIONS[t];
                const c = colorOf(d.defaultColor);
                return (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => addNew(t)}
                      className="flex h-full w-full items-start gap-2 rounded-2xl border-2 border-line p-2.5 text-left transition hover:border-brand"
                      aria-label={`Add new ${d.name}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `color-mix(in srgb, ${c.accent} 22%, var(--card))` }} aria-hidden>
                        {d.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold">{d.name}</span>
                        <span className="block text-xs text-ink-soft">{d.description}</span>
                        <span className="mt-1 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink-soft dark:bg-white/10">New widget</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {types.length === 0 && <li className="col-span-full py-4 text-center text-sm text-ink-soft">No widgets match “{q}”.</li>}
            </ul>
          </>
        )}

        {tab === "favorites" && (
          <ul className="space-y-1.5">
            {favorites.length === 0 && <li className="py-4 text-center text-sm text-ink-soft">No favorites yet. Use a widget’s ⋯ menu → Save Favorite.</li>}
            {favorites.filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()) || matches(f.type, q)).map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-2xl border-2 border-line p-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `color-mix(in srgb, ${colorOf(f.color).accent} 22%, var(--card))` }} aria-hidden>
                  {DEFINITIONS[f.type].emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{f.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-ink-soft">Favorite · {DEFINITIONS[f.type].name}</span>
                </span>
                <Button size="sm" variant="primary" onClick={() => { const id = s().addFromFavorite(f.id); close(); if (id) s().flashWidget(id); }} aria-label={`Add ${f.name}`}>
                  <Plus size={14} /> Add
                </Button>
                <IconButton label={`Pin ${f.name} to Quick Dock`} onClick={() => { s().addDockItem({ kind: "favorite", favoriteId: f.id }); s().toast({ message: "Pinned to Quick Dock", tone: "success" }); }}>
                  <Anchor size={16} />
                </IconButton>
                <IconButton label={`Delete favorite ${f.name}`} onClick={async () => { if (await ask(`Delete the favorite “${f.name}”? Widgets already created from it are not affected.`)) s().deleteFavorite(f.id); }}>
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}

        {tab === "removed" && (
          <ul className="space-y-1.5">
            {removed.length === 0 && <li className="py-4 text-center text-sm text-ink-soft">Nothing removed. Removed widgets keep their settings and data here.</li>}
            {removed.filter((w) => matches(w.type, q) || (w.title ?? "").toLowerCase().includes(q.toLowerCase())).map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-2xl border-2 border-line p-2">
                <span className="text-2xl" aria-hidden>{DEFINITIONS[w.type].emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{w.title || DEFINITIONS[w.type].name}</span>
                  <span className="block text-xs text-ink-soft">
                    from {workspaces.find((x) => x.id === w.workspaceId)?.name ?? "a deleted workspace"} · {new Date(w.removedAt!).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
                <Button size="sm" variant="primary" onClick={() => { s().restoreWidget(w.id); s().flashWidget(w.id); }} aria-label={`Restore ${w.title || DEFINITIONS[w.type].name}`}>
                  <RotateCcw size={14} /> Restore
                </Button>
                <IconButton
                  label={`Delete ${w.title || DEFINITIONS[w.type].name} permanently`}
                  onClick={async () => {
                    if (await ask("Permanently delete this widget and its saved settings? This can't be undone.", "Delete forever")) s().deleteWidgetForever(w.id);
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}

        {tab === "packs" && (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {PACKS.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.types.some((t) => matches(t, q))).map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-2xl border-2 border-line p-3">
                <p className="text-lg font-black">{p.emoji} {p.name}</p>
                <p className="text-sm text-ink-soft">{p.description}</p>
                <p className="text-sm">{p.types.map((t) => `${DEFINITIONS[t].emoji} ${DEFINITIONS[t].name}`).join(" · ")}</p>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-auto"
                  onClick={() => {
                    for (const t of p.types) s().addWidget(t);
                    s().toast({ message: `Added ${p.name} pack to this workspace`, tone: "success" });
                    close();
                  }}
                >
                  <Plus size={14} /> Add pack to workspace
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
