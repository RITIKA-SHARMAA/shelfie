import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addJournal } from "./journal";
import { sampleBooks, sampleJournal } from "./sample";
import type { Book, BookDetails, BookResult, JournalEntry, Status } from "./types";

/**
 * The whole shelf lives in one Zustand store saved to localStorage: no account,
 * no database, nothing leaves the browser except searches and AI requests.
 */

export interface Pick {
  title: string;
  author: string;
  reason: string;
  olKey: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  tags: string[];
  gutenbergId?: string | null;
}

export type PickSet = { items: Pick[]; at: number };

/** A saved copy of the shelf, taken automatically before anything that removes a lot at once. */
export interface Snapshot {
  at: number;
  label: string;
  books: Book[];
  goals: Record<string, number>;
  journal: JournalEntry[];
}

/** What a backup file holds. */
export interface Backup {
  app: "shelfie";
  version: 2;
  exportedAt: number;
  books: Book[];
  goals: Record<string, number>;
  journal: JournalEntry[];
}

export const DEFAULT_GOAL = 24;
const SNAPSHOTS_MAX = 6;
const DETAILS_MAX = 120;

interface State {
  books: Book[];
  /** Reading goal per year, e.g. { "2026": 24 }. */
  goals: Record<string, number>;
  /** True while the shelf still holds the sample books. */
  isSample: boolean;
  /** False until the visitor has chosen to start their own shelf or explore the sample. */
  onboarded: boolean;
  journal: JournalEntry[];
  snapshots: Snapshot[];
  /** AI suggestions, kept per mood so switching moods is instant. */
  picks: Record<string, PickSet>;
  /** Titles already suggested, so "Suggest again" brings new ones. */
  seen: string[];
  dismissed: string[];
  yearLine: { key: string; line: string } | null;
  /** "About this book" answers, cached so a book opens instantly the second time. */
  details: Record<string, BookDetails & { at: number }>;
  /** Where the reader was left in each book, as a paragraph index. */
  readerPos: Record<string, number>;

  addBook: (r: BookResult, status: Status) => string;
  updateBook: (id: string, patch: Partial<Omit<Book, "id">>) => void;
  setStatus: (id: string, status: Status) => void;
  setFinishedAt: (id: string, ts: number) => void;
  removeBook: (id: string) => void;
  restoreBooks: (books: Book[], journal?: JournalEntry[]) => void;
  setGoal: (year: number, n: number) => void;
  startOwn: () => void;
  clearSample: () => void;
  loadSample: () => void;
  setPicks: (mood: string, items: Pick[]) => void;
  dismissPick: (title: string) => void;
  setYearLine: (key: string, line: string) => void;
  saveDetails: (key: string, d: BookDetails, bookId?: string) => void;
  setReaderPos: (bookId: string, paragraph: number) => void;
  snapshot: (label: string) => void;
  restoreSnapshot: (at: number) => void;
  importBackup: (b: Backup) => void;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Status changes also keep the dates and progress consistent. */
export function withStatus(book: Book, status: Status, now = Date.now()): Book {
  if (book.status === status) return book;
  const next: Book = { ...book, status, updatedAt: now };
  if (status === "reading") {
    next.startedAt = book.startedAt ?? now;
    next.finishedAt = null;
    if (book.status === "finished") next.currentPage = 0;
  } else if (status === "finished") {
    next.startedAt = book.startedAt ?? now;
    next.finishedAt = now;
    next.currentPage = book.pages;
  } else {
    next.finishedAt = null;
    next.currentPage = 0;
  }
  return next;
}

/** Key for the details cache: the Open Library work when known, otherwise title + author. */
export function detailsKey(b: { olKey?: string | null; title: string; author: string }): string {
  return b.olKey || `t:${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
}

export const isSampleBook = (id: string) => id.startsWith("sample-");

/** Keep only well-formed books from an imported file. */
export function parseBackup(raw: unknown): Backup | null {
  const r = raw as Partial<Backup> | null;
  if (!r || r.app !== "shelfie" || !Array.isArray(r.books)) return null;
  const books = r.books.filter(
    (b): b is Book =>
      !!b &&
      typeof b.id === "string" &&
      typeof b.title === "string" &&
      typeof b.author === "string" &&
      ["reading", "want", "finished"].includes(b.status),
  );
  const goals: Record<string, number> = {};
  for (const [y, n] of Object.entries(r.goals ?? {}))
    if (/^\d{4}$/.test(y) && Number(n) > 0) goals[y] = Math.min(365, Math.round(Number(n)));
  const journal = Array.isArray(r.journal) ? r.journal.filter((j) => j && typeof j.at === "number" && typeof j.title === "string") : [];
  return { app: "shelfie", version: 2, exportedAt: Number(r.exportedAt) || 0, books, goals, journal };
}

const thisYear = () => String(new Date().getFullYear());

export const useShelf = create<State>()(
  persist(
    (set, get) => {
      const log = (book: Book, kind: JournalEntry["kind"], pages?: number) =>
        set((s) => ({ journal: addJournal(s.journal, { bookId: book.id, title: book.title, kind, pages }) }));

      const takeSnapshot = (label: string) =>
        set((s) => ({
          snapshots: [{ at: Date.now(), label, books: s.books, goals: s.goals, journal: s.journal }, ...s.snapshots].slice(
            0,
            SNAPSHOTS_MAX,
          ),
        }));

      return {
        books: sampleBooks(),
        goals: { [thisYear()]: DEFAULT_GOAL },
        isSample: true,
        onboarded: false,
        journal: [],
        snapshots: [],
        picks: {},
        seen: [],
        dismissed: [],
        yearLine: null,
        details: {},
        readerPos: {},

        addBook: (r, status) => {
          const existing = get().books.find((b) => (r.olKey && b.olKey === r.olKey) || b.title.toLowerCase() === r.title.toLowerCase());
          if (existing) return existing.id;
          const now = Date.now();
          const book: Book = withStatus(
            {
              id: uid(),
              olKey: r.olKey || null,
              title: r.title,
              author: r.author,
              year: r.year,
              pages: r.pages ?? 0,
              coverId: r.coverId,
              tags: r.tags,
              status: "want",
              currentPage: 0,
              rating: 0,
              notes: "",
              addedAt: now,
              startedAt: null,
              finishedAt: null,
              updatedAt: now,
              gutenbergId: r.gutenbergId ?? null,
            },
            status,
            now,
          );
          set((s) => ({ books: [...s.books, book] }));
          log(book, status === "want" ? "added" : status === "reading" ? "started" : "finished");
          return book.id;
        },

        updateBook: (id, patch) => {
          const before = get().books.find((b) => b.id === id);
          if (!before) return;
          const next = { ...before, ...patch, updatedAt: Date.now() };
          next.currentPage = Math.max(0, Math.min(next.pages || next.currentPage, next.currentPage));
          next.rating = Math.max(0, Math.min(5, Math.round(next.rating)));
          set((s) => ({ books: s.books.map((b) => (b.id === id ? next : b)) }));
          const read = next.currentPage - before.currentPage;
          if (read > 0 && next.status === "reading") log(next, "read", read);
        },

        setStatus: (id, status) => {
          const before = get().books.find((b) => b.id === id);
          if (!before || before.status === status) return;
          const next = withStatus(before, status);
          set((s) => ({ books: s.books.map((b) => (b.id === id ? next : b)) }));
          if (status === "reading") log(next, "started");
          if (status === "finished") log(next, "finished");
        },

        setFinishedAt: (id, ts) =>
          set((s) => {
            const at = Math.min(ts, Date.now());
            return {
              books: s.books.map((b) =>
                b.id === id && b.status === "finished"
                  ? { ...b, finishedAt: at, startedAt: b.startedAt && b.startedAt > at ? at : b.startedAt, updatedAt: Date.now() }
                  : b,
              ),
              // Move the matching journal line to the new date too.
              journal: s.journal.map((j) => (j.bookId === id && j.kind === "finished" ? { ...j, at } : j)),
            };
          }),

        removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),

        restoreBooks: (books, journal) => set((s) => ({ books, journal: journal ?? s.journal })),

        setGoal: (year, n) => set((s) => ({ goals: { ...s.goals, [String(year)]: Math.max(1, Math.min(365, Math.round(n))) } })),

        startOwn: () => set({ books: [], journal: [], isSample: false, onboarded: true, picks: {}, seen: [], yearLine: null }),

        // Only the sample books go. Anything the visitor added stays, and a snapshot is kept just in case.
        clearSample: () => {
          takeSnapshot("Before clearing the sample books");
          set((s) => ({
            books: s.books.filter((b) => !isSampleBook(b.id)),
            journal: s.journal.filter((j) => !isSampleBook(j.bookId)),
            isSample: false,
            onboarded: true,
            picks: {},
            seen: [],
            yearLine: null,
          }));
        },

        loadSample: () =>
          set((s) => {
            const own = s.books.filter((b) => !isSampleBook(b.id));
            const sample = sampleBooks().filter((b) => !own.some((o) => o.title.toLowerCase() === b.title.toLowerCase()));
            return {
              books: [...own, ...sample],
              journal: [...s.journal.filter((j) => !isSampleBook(j.bookId)), ...sampleJournal(sample)].sort((a, b) => a.at - b.at),
              isSample: true,
              onboarded: true,
              picks: {},
              yearLine: null,
            };
          }),

        setPicks: (mood, items) =>
          set((s) => ({
            picks: { ...s.picks, [mood]: { items, at: Date.now() } },
            seen: [...new Set([...s.seen, ...items.map((p) => p.title.toLowerCase())])].slice(-80),
          })),

        dismissPick: (title) =>
          set((s) => ({
            dismissed: [...new Set([...s.dismissed, title.toLowerCase()])].slice(-100),
            picks: Object.fromEntries(
              Object.entries(s.picks).map(([m, p]) => [m, { ...p, items: p.items.filter((i) => i.title !== title) }]),
            ),
          })),

        setYearLine: (key, line) => set({ yearLine: { key, line } }),

        saveDetails: (key, d, bookId) =>
          set((s) => {
            const entry = { ...d, at: Date.now() };
            // Also file it under the Open Library key, which a book gains once its details are known.
            const entries = Object.entries({ ...s.details, [key]: entry, ...(d.olKey ? { [d.olKey]: entry } : {}) })
              .sort((a, b) => b[1].at - a[1].at)
              .slice(0, DETAILS_MAX);
            // Fill in what a book was missing (sample and hand-added books have no cover or Open Library link).
            const books = bookId
              ? s.books.map((b) =>
                  b.id === bookId
                    ? {
                        ...b,
                        olKey: b.olKey ?? d.olKey,
                        coverId: b.coverId ?? d.coverId,
                        year: b.year ?? d.year,
                        pages: b.pages || d.pages || 0,
                        gutenbergId: b.gutenbergId ?? d.gutenbergId,
                      }
                    : b,
                )
              : s.books;
            return { details: Object.fromEntries(entries), books };
          }),

        setReaderPos: (bookId, paragraph) => set((s) => ({ readerPos: { ...s.readerPos, [bookId]: Math.max(0, Math.round(paragraph)) } })),

        snapshot: takeSnapshot,

        restoreSnapshot: (at) => {
          const snap = get().snapshots.find((x) => x.at === at);
          if (!snap) return;
          takeSnapshot("Before restoring an earlier copy");
          set({ books: snap.books, goals: snap.goals, journal: snap.journal, isSample: snap.books.some((b) => isSampleBook(b.id)) });
        },

        importBackup: (b) => {
          takeSnapshot("Before importing a backup");
          set((s) => ({
            books: b.books,
            goals: { ...s.goals, ...b.goals },
            journal: b.journal,
            isSample: b.books.some((x) => isSampleBook(x.id)),
            onboarded: true,
          }));
        },
      };
    },
    {
      name: "shelfie",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Version 1 had one goal and one set of picks. Keep the visitor's books and goal.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const old = s.picks as { mood: string; items: Pick[]; at: number } | null;
          const books = (s.books as Book[] | undefined) ?? [];
          return {
            ...s,
            goals: { [thisYear()]: Number(s.goal) || DEFAULT_GOAL },
            picks: old?.items ? { [old.mood]: { items: old.items, at: old.at } } : {},
            seen: [],
            journal: [],
            snapshots: [],
            details: {},
            readerPos: {},
            onboarded: books.length > 0,
          };
        }
        return s;
      },
    },
  ),
);

export const goalFor = (goals: Record<string, number>, year: number) => goals[String(year)] ?? DEFAULT_GOAL;

/** Books in shelf order: reading, then want to read, then finished; newest activity first inside each group. */
export function shelfOrder(books: Book[]): Book[] {
  const rank = { reading: 0, want: 1, finished: 2 } as const;
  return [...books].sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt - a.updatedAt);
}
