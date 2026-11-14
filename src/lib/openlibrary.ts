import { z } from "zod";
import { tagsFromSubjects } from "./tags";
import type { BookResult } from "./types";

/**
 * Open Library (openlibrary.org) is a free, open book catalogue with no API key.
 * Only the fields we use are requested, which keeps responses small.
 */

export const OL_FIELDS = "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,id_project_gutenberg";

export function searchUrl(q: string, limit = 8, fields = OL_FIELDS): string {
  const params = new URLSearchParams({ q, fields, limit: String(limit) });
  return `https://openlibrary.org/search.json?${params}`;
}

export function coverUrl(coverId: number, size: "S" | "M" | "L" = "M"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

const docSchema = z.object({
  key: z.string(),
  title: z.string(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  cover_i: z.number().optional(),
  number_of_pages_median: z.number().optional(),
  subject: z.array(z.string()).optional(),
  id_project_gutenberg: z.array(z.string()).optional(),
});

/** First Project Gutenberg id that looks valid (digits only). */
export function gutenbergIdOf(ids: unknown): string | null {
  if (!Array.isArray(ids)) return null;
  const id = ids.find((x) => typeof x === "string" && /^\d{1,6}$/.test(x));
  return id ?? null;
}

export function normalizeDoc(raw: unknown): BookResult | null {
  const parsed = docSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (!d.key.startsWith("/works/")) return null;
  return {
    olKey: d.key,
    title: d.title.trim(),
    author: d.author_name?.[0]?.trim() || "Unknown author",
    year: d.first_publish_year ?? null,
    pages: d.number_of_pages_median ?? null,
    coverId: d.cover_i ?? null,
    tags: tagsFromSubjects(d.subject),
    gutenbergId: gutenbergIdOf(d.id_project_gutenberg),
  };
}

export function normalizeSearch(body: unknown): BookResult[] {
  const docs = (body as { docs?: unknown[] })?.docs;
  if (!Array.isArray(docs)) return [];
  const seen = new Set<string>();
  const out: BookResult[] = [];
  for (const raw of docs) {
    const r = normalizeDoc(raw);
    if (!r || seen.has(r.olKey)) continue;
    seen.add(r.olKey);
    out.push(r);
  }
  return out;
}

export const USER_AGENT = "Shelfie/1.0 (portfolio reading-shelf app)";

/** Server-side fetch of Open Library JSON. Open Library asks API users to send an identifying User-Agent. */
export async function olJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 3600 },
  } as RequestInit);
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  return res.json();
}

export async function searchOpenLibrary(q: string, limit = 8, timeoutMs = 8000): Promise<BookResult[]> {
  return normalizeSearch(await olJson(searchUrl(q, limit), timeoutMs));
}

/** Lower-case, drop subtitles, punctuation and a leading "the/a/an". */
export function normTitle(t: string): string {
  return t
    .toLowerCase()
    .split(/[:(]/)[0]
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/^(the|a|an) /, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when two titles name the same book, ignoring subtitles and articles. */
export function sameTitle(a: string, b: string): boolean {
  const x = normTitle(a);
  const y = normTitle(b);
  return x.length > 0 && (x === y || (x.length >= 6 && y.startsWith(x)) || (y.length >= 6 && x.startsWith(y)));
}

export function sameAuthor(a: string, b: string): boolean {
  const last = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .trim()
      .split(/\s+/)
      .pop() ?? "";
  return last(a) !== "" && last(a) === last(b);
}
