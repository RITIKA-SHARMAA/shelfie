import type { Book, JournalEntry, Status } from "./types";

/**
 * A sample shelf shown on first visit so the app never opens empty. It is
 * clearly labelled as sample data and can be cleared in one click.
 * Page counts are approximate and finish dates fall in the current year.
 */
type Seed = [
  title: string,
  author: string,
  year: number | null,
  pages: number,
  tags: string[],
  status: Status,
  extra?: Partial<Book> & { month?: number },
];

// Most sample books are in the public domain, so they can be read inside the app straight away
// (the last field is the Project Gutenberg id). Three well-known modern books keep the AI suggestions varied.
const SEEDS: Seed[] = [
  ["The Great Gatsby", "F. Scott Fitzgerald", 1925, 180, ["Classics", "Fiction"], "reading", { currentPage: 72, gutenbergId: "64317" }],
  ["Meditations", "Marcus Aurelius", null, 254, ["Classics", "Self-help"], "reading", { currentPage: 60, gutenbergId: "2680" }],
  ["Siddhartha", "Hermann Hesse", 1922, 152, ["Classics", "Fiction"], "reading", { currentPage: 34, gutenbergId: "2500" }],
  ["Pride and Prejudice", "Jane Austen", 1813, 351, ["Classics", "Fiction"], "want", { gutenbergId: "1342" }],
  ["Frankenstein", "Mary Shelley", 1818, 280, ["Classics", "Sci-fi", "Fiction"], "want", { gutenbergId: "84" }],
  ["The Adventures of Sherlock Holmes", "Arthur Conan Doyle", 1892, 309, ["Classics", "Fiction"], "want", { gutenbergId: "1661" }],
  ["Dracula", "Bram Stoker", 1897, 384, ["Classics", "Fiction"], "want", { gutenbergId: "345" }],
  ["Jane Eyre", "Charlotte Brontë", 1847, 500, ["Classics", "Fiction"], "want", { gutenbergId: "1260" }],
  ["Little Women", "Louisa May Alcott", 1868, 449, ["Classics", "Fiction"], "want", { gutenbergId: "514" }],
  [
    "Alice's Adventures in Wonderland",
    "Lewis Carroll",
    1865,
    133,
    ["Classics", "Fantasy"],
    "finished",
    { rating: 4, month: 0, gutenbergId: "11" },
  ],
  ["The Alchemist", "Paulo Coelho", 1988, 208, ["Fiction"], "finished", { rating: 4, month: 2 }],
  ["The Art of War", "Sun Tzu", null, 112, ["Classics", "History"], "finished", { rating: 3, month: 3, gutenbergId: "132" }],
  ["Atomic Habits", "James Clear", 2018, 320, ["Self-help"], "finished", { rating: 4, month: 5 }],
  ["Deep Work", "Cal Newport", 2016, 296, ["Self-help"], "finished", { rating: 5, month: 5 }],
  [
    "The Picture of Dorian Gray",
    "Oscar Wilde",
    1890,
    246,
    ["Classics", "Fiction"],
    "finished",
    { rating: 4, month: 6, gutenbergId: "174" },
  ],
  ["The Time Machine", "H. G. Wells", 1895, 118, ["Classics", "Sci-fi"], "finished", { rating: 4, month: 8, gutenbergId: "35" }],
  [
    "A Tale of Two Cities",
    "Charles Dickens",
    1859,
    388,
    ["Classics", "History", "Fiction"],
    "finished",
    { rating: 4, month: 9, gutenbergId: "98" },
  ],
  ["Great Expectations", "Charles Dickens", 1861, 482, ["Classics", "Fiction"], "finished", { rating: 4, month: 10, gutenbergId: "1400" }],
];

export function sampleBooks(now = Date.now()): Book[] {
  const today = new Date(now);
  const year = today.getFullYear();
  return SEEDS.map(([title, author, pubYear, pages, tags, status, extra = {}], i) => {
    const { month, ...rest } = extra;
    let finishedAt: number | null = null;
    if (status === "finished") {
      // Keep sample finish dates in the past, in this year.
      const m = Math.min(month ?? 0, today.getMonth());
      const day = m === today.getMonth() ? Math.max(1, Math.min(12, today.getDate() - 1)) : 12;
      finishedAt = Math.min(new Date(year, m, day, 20).getTime(), now - 3_600_000);
    }
    // Earlier seeds count as more recent, so "The Great Gatsby" is the current read and "Pride and Prejudice" is up next.
    const t = now - (i + 1) * 60_000;
    return {
      id: `sample-${i + 1}`,
      olKey: null,
      title,
      author,
      year: pubYear,
      pages,
      coverId: null,
      tags,
      status,
      currentPage: status === "finished" ? pages : 0,
      rating: 0,
      notes: "",
      addedAt: t,
      startedAt: status === "want" ? null : t,
      finishedAt,
      updatedAt: finishedAt ?? t,
      gutenbergId: null,
      ...rest,
    };
  });
}

/** A few days of sample journal entries, so the streak and journal aren't empty on the sample shelf. */
export function sampleJournal(books: Book[], now = Date.now()): JournalEntry[] {
  const day = 86_400_000;
  const out: JournalEntry[] = [];
  const reading = books.filter((b) => b.status === "reading");
  [24, 18, 31, 12].forEach((pages, i) => {
    const b = reading[i % reading.length];
    if (b) out.push({ id: `sample-j${i}`, at: now - (i + 1) * day + 3_600_000, bookId: b.id, title: b.title, kind: "read", pages });
  });
  for (const b of books)
    if (b.finishedAt) out.push({ id: `sample-f-${b.id}`, at: b.finishedAt, bookId: b.id, title: b.title, kind: "finished" });
  return out.sort((a, b) => a.at - b.at);
}
