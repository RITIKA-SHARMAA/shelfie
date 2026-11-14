import type { Book, Status } from "./types";

/**
 * Every book gets a spine colour, height and width that are worked out from
 * its title and page count, so the same book always looks the same on every
 * device without storing any of it.
 */

/** FNV-1a: a tiny, fast, well-spread string hash. */
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Earthy Japandi tones for books you are reading or have finished. */
const DEEP: [string, string][] = [
  ["#3f3a35", "#e8dfd0"],
  ["#5f6b56", "#f4efe6"],
  ["#9c6b4e", "#f6ece0"],
  ["#b4785a", "#f6ece0"],
  ["#2f2c28", "#d6c6ac"],
  ["#7a4a35", "#f6ece0"],
  ["#6b6a4a", "#f2ead2"],
  ["#4a4239", "#e8dfd0"],
  ["#8a5a3c", "#f6ece0"],
  ["#c7a27c", "#3b2a1a"],
  ["#8c9a86", "#f4efe6"],
];

/** Pale, airy tones for books still waiting on the shelf. */
const PALE: [string, string][] = [
  ["#e9dccb", "#7a5a42"],
  ["#dfe3d6", "#56604a"],
  ["#efe7da", "#6f665b"],
  ["#e6dccd", "#5d5348"],
  ["#d9ded6", "#4d5a4e"],
  ["#ecd9c8", "#8a5a3c"],
  ["#e4e0d4", "#5c5a48"],
];

export interface SpineLook {
  color: string;
  ink: string;
  height: number;
  width: number;
  /** Small lean for the last book in a group, purely decorative. */
  tilt: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function spineLook(book: Pick<Book, "title" | "author" | "pages" | "status">, status: Status = book.status): SpineLook {
  const h = hash(`${book.title}|${book.author}`);
  const palette = status === "want" ? PALE : DEEP;
  const [color, ink] = palette[h % palette.length];
  const pages = book.pages > 0 ? book.pages : 250;
  // Longer books stand taller and thicker; a little jitter keeps the row natural.
  const height = Math.round(150 + clamp01((pages - 120) / 500) * 60 + ((h >>> 8) % 11) - 5);
  const width = Math.round(24 + clamp01((pages - 100) / 550) * 22);
  return { color, ink, height, width, tilt: 0 };
}

/** Deterministic cover colours for books without a cover image. */
export function coverLook(book: Pick<Book, "title" | "author">): { color: string; ink: string } {
  const [color, ink] = DEEP[hash(`${book.title}|${book.author}`) % DEEP.length];
  return { color, ink };
}
