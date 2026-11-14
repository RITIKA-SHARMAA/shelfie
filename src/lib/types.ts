export type Status = "reading" | "want" | "finished";

export const STATUS_LABEL: Record<Status, string> = {
  reading: "Currently reading",
  want: "Want to read",
  finished: "Finished",
};

/** Order books appear on the shelf, left to right. */
export const STATUS_ORDER: Status[] = ["reading", "want", "finished"];

export interface Book {
  id: string;
  /** Open Library work key, e.g. "/works/OL45804W". Null for books added by hand. */
  olKey: string | null;
  title: string;
  author: string;
  year: number | null;
  pages: number;
  /** Open Library cover id, used to build a cover image URL. */
  coverId: number | null;
  tags: string[];
  status: Status;
  currentPage: number;
  /** 0 = not rated, otherwise 1..5. */
  rating: number;
  notes: string;
  addedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  /** Project Gutenberg id when the book is in the public domain and its text can be read in the app. */
  gutenbergId?: string | null;
}

/** A book as returned by search, before it is on the shelf. */
export interface BookResult {
  olKey: string;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  tags: string[];
  gutenbergId?: string | null;
}

export type EbookAccess = "public" | "borrowable" | "printdisabled" | "no_ebook";

/** What the "About this book" panel shows. Comes from Open Library, with an AI summary only when it has no description. */
export interface BookDetails {
  olKey: string | null;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  summary: string | null;
  summarySource: "openlibrary" | "ai" | null;
  themes: string[];
  awards: string[];
  rating: { average: number; count: number } | null;
  firstSentence: string | null;
  gutenbergId: string | null;
  ebookAccess: EbookAccess | null;
}

export type JournalKind = "added" | "started" | "read" | "finished";

/** One line in the reading journal. Titles are copied in so the journal survives a book being removed. */
export interface JournalEntry {
  id: string;
  at: number;
  bookId: string;
  title: string;
  kind: JournalKind;
  /** Pages read, for "read" entries. */
  pages?: number;
}
