/** Roster import helpers: paste parsing, CSV parsing, validation and duplicate handling. */

export interface ImportResult {
  names: string[];
  duplicates: string[]; // skipped because already present (or repeated in the input)
  invalid: string[]; // skipped lines (too long, empty after cleanup, etc.)
}

const MAX_NAME = 60;

export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
}

/** Minimal RFC-4180-style CSV parser (quotes, escaped quotes, CRLF). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Extract names from CSV. Recognizes a header row containing "name", or "first"+"last" columns.
 * Without a header, the first column is used.
 */
export function namesFromCSV(text: string): string[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) => ["name", "student", "student name", "full name"].includes(h));
  const firstIdx = header.findIndex((h) => ["first", "first name", "firstname", "given name"].includes(h));
  const lastIdx = header.findIndex((h) => ["last", "last name", "lastname", "surname", "family name"].includes(h));
  if (nameIdx >= 0) return rows.slice(1).map((r) => r[nameIdx] ?? "");
  if (firstIdx >= 0) {
    return rows.slice(1).map((r) => [r[firstIdx] ?? "", lastIdx >= 0 ? r[lastIdx] ?? "" : ""].join(" "));
  }
  return rows.map((r) => r[0] ?? "");
}

/** One name per line; also accepts comma- or semicolon-separated single lines. */
export function namesFromPaste(text: string): string[] {
  const lines = text.split(/\r?\n/);
  if (lines.filter((l) => l.trim()).length === 1 && /[,;]/.test(text)) return text.split(/[,;]/);
  return lines;
}

export function validateNames(candidates: string[], existing: string[]): ImportResult {
  const seen = new Set(existing.map((n) => n.toLowerCase()));
  const names: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  for (const raw of candidates) {
    const name = cleanName(raw);
    if (!name) continue;
    if (name.length > MAX_NAME) {
      invalid.push(name.slice(0, 20) + "…");
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(name);
      continue;
    }
    seen.add(key);
    names.push(name);
  }
  return { names, duplicates, invalid };
}
