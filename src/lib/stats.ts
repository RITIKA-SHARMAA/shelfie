import type { Book } from "./types";

export interface YearStats {
  year: number;
  finished: Book[];
  pages: number;
  favourite: Book | null;
  longest: Book | null;
  /** Books finished in each month, January first. */
  perMonth: number[];
  topTag: { tag: string; count: number } | null;
}

export function finishedInYear(books: Book[], year: number): Book[] {
  return books
    .filter((b) => b.status === "finished" && b.finishedAt && new Date(b.finishedAt).getFullYear() === year)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
}

export function yearStats(books: Book[], year: number): YearStats {
  const finished = finishedInYear(books, year);
  const perMonth = Array.from({ length: 12 }, () => 0);
  const tagCounts = new Map<string, number>();
  let favourite: Book | null = null;
  let longest: Book | null = null;
  for (const b of finished) {
    perMonth[new Date(b.finishedAt!).getMonth()] += 1;
    for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    // Highest rating wins; on a tie, the more recent read.
    if (b.rating > 0 && (!favourite || b.rating >= favourite.rating)) favourite = b;
    if (!longest || b.pages > longest.pages) longest = b;
  }
  let topTag: YearStats["topTag"] = null;
  for (const [tag, count] of tagCounts) if (!topTag || count > topTag.count) topTag = { tag, count };
  return { year, finished, pages: finished.reduce((s, b) => s + (b.pages || 0), 0), favourite, longest, perMonth, topTag };
}

export function progressPct(book: Pick<Book, "currentPage" | "pages" | "status">): number {
  if (book.status === "finished") return 100;
  if (!book.pages) return 0;
  return Math.min(100, Math.max(0, Math.round((book.currentPage / book.pages) * 100)));
}

const ONES = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 18 → "Eighteen", 42 → "Forty-two". Numbers of 100+ stay as digits. */
export function countWord(n: number): string {
  let w: string;
  if (n < 20) w = ONES[n];
  else if (n < 100) w = TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  else return n.toLocaleString("en-IN");
  return w[0].toUpperCase() + w.slice(1);
}

export function season(date: Date): string {
  const m = date.getMonth();
  return m < 2 || m === 11 ? "Winter" : m < 5 ? "Spring" : m < 8 ? "Summer" : "Autumn";
}
