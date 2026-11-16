/**
 * Built-in anchor charts (files in public/anchor-charts/). Teachers can also upload their own;
 * uploads are stored with the widget in this browser session and never sent anywhere.
 */
export interface BuiltInChart {
  id: string;
  name: string;
  src: string;
  /** Optional grouping in the drop-down, e.g. "Word Work". */
  group?: string;
}

export const BUILT_IN_CHARTS: BuiltInChart[] = [];

export interface UploadedChart {
  id: string;
  name: string;
  /** data: URL (downscaled on upload). */
  src: string;
}

export interface AnchorConfig {
  /** "builtin:<id>" or "upload:<id>". */
  active: string | null;
  uploads: UploadedChart[];
}

export function chartFor(c: AnchorConfig, key: string | null): { key: string; name: string; src: string; uploaded: boolean } | null {
  if (!key) return null;
  if (key.startsWith("builtin:")) {
    const b = BUILT_IN_CHARTS.find((x) => `builtin:${x.id}` === key);
    return b ? { key, name: b.name, src: b.src, uploaded: false } : null;
  }
  const u = c.uploads.find((x) => `upload:${x.id}` === key);
  return u ? { key, name: u.name, src: u.src, uploaded: true } : null;
}

/** The chart to show: the chosen one, else the first available. */
export function currentChart(c: AnchorConfig) {
  return chartFor(c, c.active) ?? chartFor(c, BUILT_IN_CHARTS[0] ? `builtin:${BUILT_IN_CHARTS[0].id}` : null) ?? chartFor(c, c.uploads[0] ? `upload:${c.uploads[0].id}` : null);
}

/** "Prefix Power-Up.png" → "Prefix Power-Up". */
export const nameFromFile = (file: string) => file.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim().slice(0, 60) || "My anchor chart";

/** Shrink a poster so it saves quickly while staying readable when projected. */
export async function chartFromFile(file: File, max = 2000): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a picture (PNG, JPG or WebP). To use a PDF, save the page as a picture first.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That picture couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.88);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
