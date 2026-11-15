/**
 * TEKS (Texas Essential Knowledge and Skills) search. The data file is generated from the official
 * Texas Administrative Code by scripts/build-teks.py and loaded only when the search opens.
 */
export type TeksSubject = "ela" | "math" | "science" | "social";

export interface TeksItem {
  id: string; // "111.5:3.4K"
  code: string; // "3.4K"
  subject: TeksSubject;
  grade: string; // "K", "1".."8", "HS"
  course: string; // "Grade 3", "Algebra I"…
  strand: string;
  text: string;
  ican: string;
  cite: string;
}

export interface TeksCourse {
  section: string;
  subject: TeksSubject;
  grade: string;
  course: string;
  prefix: string;
  count: number;
}

export interface TeksData {
  source: string;
  retrieved: string;
  courses: TeksCourse[];
  items: TeksItem[];
}

export const TEKS_SUBJECTS: { value: TeksSubject; label: string }[] = [
  { value: "ela", label: "ELAR" },
  { value: "math", label: "Math" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social Studies" },
];

export const TEKS_GRADES: { value: string; label: string }[] = [
  { value: "K", label: "K" },
  ...["1", "2", "3", "4", "5", "6", "7", "8"].map((g) => ({ value: g, label: g })),
  { value: "HS", label: "High school" },
];

let cache: Promise<TeksData> | null = null;
export function loadTeks(): Promise<TeksData> {
  if (!cache) cache = import("@/data/teks.json").then((m) => (m.default ?? m) as unknown as TeksData);
  return cache;
}

/** Light stemming so "multiply" finds "multiplication" and "comparing" finds "compare". */
export function stem(word: string): string {
  const w = word.toLowerCase();
  for (const suf of ["ications", "ication", "ations", "ation", "ings", "ing", "ies", "ied", "es", "ed", "s", "y", "e"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      let base = w.slice(0, -suf.length);
      // "inferring" → "infer", "planned" → "plan" (but keep "spell", "pass").
      if (["ing", "ings", "ed"].includes(suf) && /([^aeiouls])\1$/.test(base)) base = base.slice(0, -1);
      return base;
    }
  }
  return w;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Pattern for one search word. Matches at the start of a word, with word-family endings:
 * "multiply" → multiply, multiplying, multiplied, multiplication (but not "multiple");
 * "infer" → infer, inferences; "compare" → compare, comparing, comparison.
 */
export function wordPattern(word: string): string {
  const w = word.toLowerCase();
  if (/[^aeiou]y$/.test(w) && w.length >= 4) return `\\b${esc(w.slice(0, -1))}[yi]`;
  if (/(ies|ied)$/.test(w) && w.length >= 5) return `\\b${esc(w.slice(0, -3))}[yi]`;
  return `\\b${esc(stem(w))}`;
}

export function queryRegexes(query: string): RegExp[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1)
    .map((t) => new RegExp(wordPattern(t), "i"));
}

export interface TeksQuery {
  subject: TeksSubject;
  grade: string;
  course?: string | null;
  query: string;
}

/** All items for the grade/subject (and course), filtered by every word in the query. */
export function searchTeks(items: TeksItem[], q: TeksQuery): TeksItem[] {
  const pool = items.filter((i) => i.subject === q.subject && i.grade === q.grade && (!q.course || i.course === q.course));
  const raw = q.query.trim().toLowerCase();
  if (!raw) return pool;
  const codeHit = pool.filter((i) => i.code.toLowerCase() === raw || i.code.toLowerCase().startsWith(raw + "(") || i.code.toLowerCase() === raw.replace(/\s+/g, ""));
  if (codeHit.length) return codeHit;
  const res = queryRegexes(raw);
  return pool.filter((i) => {
    const hay = `${i.code} ${i.strand} ${i.text}`;
    return res.every((r) => r.test(hay));
  });
}

export function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
