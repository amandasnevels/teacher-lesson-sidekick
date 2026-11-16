"use client";
import { useRef, useState } from "react";
import { ImagePlus, Maximize2, Pencil, Trash2 } from "lucide-react";
import { useConfig } from "@/store/hooks";
import { useSidekick } from "@/store/store";
import { uid } from "@/lib/ids";
import { Button, EmptyState, IconButton, cx, inputCls, useConfirm, usePrompt } from "@/components/ui";
import type { WidgetModule, WidgetProps } from "../types";
import { BUILT_IN_CHARTS, chartFromFile, currentChart, nameFromFile, type AnchorConfig } from "./charts";

function useUpload(id: string) {
  const [c, set] = useConfig<AnchorConfig>(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const added = [];
      for (const f of Array.from(files).slice(0, 12)) added.push({ id: uid("ac"), name: nameFromFile(f.name), src: await chartFromFile(f) });
      set({ uploads: [...(c.uploads ?? []), ...added], active: `upload:${added[added.length - 1].id}` });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple
      className="sr-only"
      aria-label="Upload anchor charts"
      data-testid="anchor-upload"
      onChange={(e) => {
        void onFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );
  return { open: () => ref.current?.click(), input, busy, err };
}

function Body({ id, view }: WidgetProps) {
  const [c, set] = useConfig<AnchorConfig>(id);
  const up = useUpload(id);
  const [confirmEl, ask] = useConfirm();
  const [promptEl, prompt] = usePrompt();
  const uploads = c.uploads ?? [];
  const chart = currentChart({ active: c.active, uploads });
  const big = view === "expanded";

  if (!chart)
    return (
      <EmptyState emoji="🖼️" title="Add an anchor chart">
        <p className="text-sm text-ink-soft">Upload a picture of your poster (PNG, JPG or WebP). It stays on this computer.</p>
        <Button variant="accent" onClick={up.open} disabled={up.busy}>
          <ImagePlus size={16} /> {up.busy ? "Adding…" : "Upload anchor chart"}
        </Button>
        {up.input}
        {up.err && <p className="text-xs font-bold text-[#d93036]">{up.err}</p>}
      </EmptyState>
    );

  return (
    <div className="space-y-2">
      {confirmEl}
      {promptEl}
      <div className="flex items-center gap-1.5">
        <select className={cx(inputCls, "min-h-9 py-1 text-sm font-bold")} aria-label="Anchor chart" data-testid="anchor-select" value={chart.key} onChange={(e) => set({ active: e.target.value })}>
          {BUILT_IN_CHARTS.length > 0 && (
            <optgroup label="Anchor charts">
              {BUILT_IN_CHARTS.map((b) => (
                <option key={b.id} value={`builtin:${b.id}`}>
                  {b.name}
                </option>
              ))}
            </optgroup>
          )}
          {uploads.length > 0 && (
            <optgroup label="My charts">
              {uploads.map((u) => (
                <option key={u.id} value={`upload:${u.id}`}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <IconButton label="Upload anchor chart" variant="outline" onClick={up.open} disabled={up.busy}>
          <ImagePlus size={16} />
        </IconButton>
        {up.input}
      </div>
      {up.err && <p className="text-xs font-bold text-[#d93036]">{up.err}</p>}
      <button
        type="button"
        className="group relative block w-full overflow-hidden rounded-xl border-2 border-line bg-white"
        onClick={() => !big && useSidekick.getState().expandWidget(id)}
        aria-label={big ? chart.name : `Show ${chart.name} full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={chart.src} alt={chart.name} className={cx("mx-auto w-full object-contain", big ? "max-h-[78vh]" : "max-h-[60vh]")} data-testid="anchor-image" />
        {!big && (
          <span className="absolute right-1.5 top-1.5 rounded-lg bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-hidden>
            <Maximize2 size={14} />
          </span>
        )}
      </button>
      {chart.uploaded && (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const n = await prompt("Rename chart", "Chart name", chart.name, "Save");
              if (n?.trim()) set({ uploads: uploads.map((u) => (`upload:${u.id}` === chart.key ? { ...u, name: n.trim().slice(0, 60) } : u)) });
            }}
          >
            <Pencil size={14} /> Rename
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (await ask(`Remove “${chart.name}” from this widget?`, "Remove")) set({ uploads: uploads.filter((u) => `upload:${u.id}` !== chart.key), active: null });
            }}
          >
            <Trash2 size={14} /> Remove
          </Button>
        </div>
      )}
    </div>
  );
}

function Mini({ id }: { id: string }) {
  const [c] = useConfig<AnchorConfig>(id);
  const chart = currentChart({ active: c.active, uploads: c.uploads ?? [] });
  return <span className="max-w-32 truncate text-xs font-bold">{chart?.name ?? ""}</span>;
}

const AnchorWidget: WidgetModule = { Body, Mini };
export default AnchorWidget;
