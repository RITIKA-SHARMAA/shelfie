/**
 * Free books from Project Gutenberg (public domain in the US). The route
 * fetches the plain-text file and this turns it into clean paragraphs and
 * chapter headings for the in-app reader.
 */

export const GUTENBERG_ID = /^\d{1,6}$/;
export const MAX_TEXT_BYTES = 6_000_000;

export const gutenbergTextUrl = (id: string) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
export const gutenbergPage = (id: string) => `https://www.gutenberg.org/ebooks/${id}`;

export interface BookText {
  paragraphs: string[];
  /** Indexes of paragraphs that are chapter headings. */
  headings: number[];
  /** Where reading should start for a new reader: the first chapter, skipping title pages. */
  start: number;
}

const START = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG E-?BOOK[^\n]*/i;
const END = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG E-?BOOK/i;
const HEADING =
  /^((chapter|book|part|volume|letter|act|stave|canto)\s+([ivxlcdm]+|\d+|the\s+\w+|[a-z]+)\b[^\n]{0,70}|the\s+[a-z]+\s+(book|chapter|part)\.?)$/i;
const ROMAN = /^[IVXLC]{1,7}\.?$/;

export function parseGutenberg(raw: string): BookText {
  let text = raw.replace(/\r\n?/g, "\n");
  const s = START.exec(text);
  if (s) text = text.slice(s.index + s[0].length);
  const e = END.exec(text);
  if (e) text = text.slice(0, e.index);

  const paragraphs: string[] = [];
  const headings: number[] = [];
  const isHeading = (p: string) => (HEADING.test(p) && p.length < 90) || ROMAN.test(p);
  // Illustration and transcriber's notes aren't part of the book. Some span several blocks: "[Illustration:" … "]".
  let skipping = 0;
  for (const block of text.split(/\n[ \t]*\n/)) {
    let joined = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/_([^_]+)_/g, "$1")
      .trim();
    if (!joined) continue;
    if (skipping > 0) {
      skipping -= 1;
      if (!joined.includes("]")) continue;
      skipping = 0;
      // A chapter title can sit inside the note, e.g. "Chapter I.]".
      joined = joined.slice(0, joined.lastIndexOf("]")).trim();
      if (!isHeading(joined)) continue;
    } else if (/^\[(illustration|transcriber)/i.test(joined)) {
      if (!joined.includes("]")) skipping = 12;
      continue;
    }
    if (/^[*\s.]+$/.test(joined)) continue;
    if (isHeading(joined)) headings.push(paragraphs.length);
    paragraphs.push(joined);
  }

  // Start at the first real chapter if it is in the first 40% of the book.
  const firstChapter = headings.find((h) =>
    /^((chapter|letter|stave|book|part)\s+(1|i|one|the first)\b|the first (book|chapter|part)\b|(i|1)\.?$)/i.test(paragraphs[h]),
  );
  const start = firstChapter !== undefined && firstChapter < paragraphs.length * 0.4 ? firstChapter : 0;
  return { paragraphs, headings, start };
}

export interface Page {
  /** Index of the first paragraph on the page. */
  from: number;
  items: { index: number; text: string; heading: boolean }[];
}

/**
 * Split paragraphs into pages of about `budget` characters. A heading always
 * starts a new page and very long paragraphs are split between sentences.
 */
export function paginate(t: Pick<BookText, "paragraphs" | "headings">, budget: number): Page[] {
  const heads = new Set(t.headings);
  const pages: Page[] = [];
  let cur: Page = { from: 0, items: [] };
  let used = 0;
  const flush = () => {
    if (cur.items.length) pages.push(cur);
  };
  t.paragraphs.forEach((p, index) => {
    const heading = heads.has(index);
    if (heading && cur.items.length) {
      flush();
      cur = { from: index, items: [] };
      used = 0;
    }
    const chunks = p.length > budget ? splitSentences(p, budget) : [p];
    for (const text of chunks) {
      if (used + text.length > budget && cur.items.length) {
        flush();
        cur = { from: index, items: [] };
        used = 0;
      }
      if (!cur.items.length) cur.from = index;
      cur.items.push({ index, text, heading });
      used += text.length + (heading ? budget * 0.15 : 40);
    }
  });
  flush();
  return pages;
}

function splitSentences(p: string, budget: number): string[] {
  const sentences = p.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && buf.length + s.length > budget) {
      out.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** The page holding a paragraph. */
export function pageOf(pages: Page[], paragraph: number): number {
  let lo = 0;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].from <= paragraph) lo = i;
    else break;
  }
  return lo;
}
