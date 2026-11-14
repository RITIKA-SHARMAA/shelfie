import { beforeEach, describe, expect, it } from "vitest";
import { sampleBooks } from "../sample";
import { goalFor, parseBackup, shelfOrder, useShelf, withStatus } from "../store";
import type { Book } from "../types";

const base: Book = {
  id: "1",
  olKey: null,
  title: "T",
  author: "A",
  year: null,
  pages: 300,
  coverId: null,
  tags: [],
  status: "want",
  currentPage: 0,
  rating: 0,
  notes: "",
  addedAt: 0,
  startedAt: null,
  finishedAt: null,
  updatedAt: 0,
};

describe("status changes", () => {
  it("starting a book sets startedAt", () => {
    const b = withStatus(base, "reading", 1000);
    expect(b).toMatchObject({ status: "reading", startedAt: 1000, finishedAt: null, updatedAt: 1000 });
  });

  it("finishing sets finishedAt and fills progress", () => {
    const b = withStatus({ ...base, status: "reading", startedAt: 500, currentPage: 120 }, "finished", 2000);
    expect(b).toMatchObject({ status: "finished", startedAt: 500, finishedAt: 2000, currentPage: 300 });
  });

  it("re-reading a finished book clears the finish date and progress", () => {
    const b = withStatus({ ...base, status: "finished", finishedAt: 2000, currentPage: 300 }, "reading", 3000);
    expect(b).toMatchObject({ status: "reading", finishedAt: null, currentPage: 0 });
  });

  it("returns the same object when nothing changes", () => {
    expect(withStatus(base, "want")).toBe(base);
  });
});

describe("shelf order", () => {
  it("puts reading first, then want to read, then finished, newest first in each", () => {
    const books = [
      { ...base, id: "f", status: "finished" as const, updatedAt: 5 },
      { ...base, id: "w1", status: "want" as const, updatedAt: 1 },
      { ...base, id: "r", status: "reading" as const, updatedAt: 2 },
      { ...base, id: "w2", status: "want" as const, updatedAt: 9 },
    ];
    expect(shelfOrder(books).map((b) => b.id)).toEqual(["r", "w2", "w1", "f"]);
  });
});

describe("sample shelf", () => {
  it("has 3 reading, 6 want and 9 finished books, all finished in the past", () => {
    const now = new Date(2026, 10, 14).getTime();
    const s = sampleBooks(now);
    expect(s.filter((b) => b.status === "reading")).toHaveLength(3);
    expect(s.filter((b) => b.status === "want")).toHaveLength(6);
    const done = s.filter((b) => b.status === "finished");
    expect(done).toHaveLength(9);
    expect(done.every((b) => b.finishedAt! < now)).toBe(true);
    expect(shelfOrder(s)[0].title).toBe("The Great Gatsby");
    // Every reading and want-to-read sample book can be read in the app.
    expect(s.filter((b) => b.status !== "finished").every((b) => b.gutenbergId)).toBe(true);
    expect(shelfOrder(s).find((b) => b.status === "want")?.title).toBe("Pride and Prejudice");
  });
});

describe("backups", () => {
  it("accepts a Shelfie backup and drops malformed books", () => {
    const b = parseBackup({
      app: "shelfie",
      books: [base, { id: "x", title: 5 }, { ...base, id: "2", status: "lost" }],
      goals: { "2025": 12, nope: 3, "2026": -1 },
      journal: [{ at: 1, title: "T" }, null],
    });
    expect(b?.books.map((x) => x.id)).toEqual(["1"]);
    expect(b?.goals).toEqual({ "2025": 12 });
    expect(b?.journal).toHaveLength(1);
  });

  it("rejects other files", () => {
    expect(parseBackup({ books: [] })).toBeNull();
    expect(parseBackup(null)).toBeNull();
  });
});

describe("store actions", () => {
  beforeEach(() => {
    useShelf.setState({ books: sampleBooks(), journal: [], snapshots: [], isSample: true, goals: {} });
  });

  it("clearing the sample keeps the visitor's own books and saves a copy first", () => {
    useShelf
      .getState()
      .addBook({ olKey: "/works/OL9W", title: "My Book", author: "Me", year: null, pages: 200, coverId: null, tags: [] }, "reading");
    useShelf.getState().clearSample();
    const s = useShelf.getState();
    expect(s.books.map((b) => b.title)).toEqual(["My Book"]);
    expect(s.isSample).toBe(false);
    expect(s.snapshots[0].books.length).toBe(19);
  });

  it("a saved copy can be restored", () => {
    useShelf.getState().clearSample();
    const at = useShelf.getState().snapshots[0].at;
    useShelf.getState().restoreSnapshot(at);
    expect(useShelf.getState().books).toHaveLength(18);
  });

  it("logs started, pages read and finished in the journal", () => {
    const id = useShelf
      .getState()
      .addBook({ olKey: "/works/OL8W", title: "Log Me", author: "A", year: null, pages: 300, coverId: null, tags: [] }, "want");
    useShelf.getState().setStatus(id, "reading");
    useShelf.getState().updateBook(id, { currentPage: 40 });
    useShelf.getState().updateBook(id, { currentPage: 30 }); // going back isn't reading
    useShelf.getState().setStatus(id, "finished");
    expect(useShelf.getState().journal.map((j) => `${j.kind}${j.pages ?? ""}`)).toEqual(["added", "started", "read40", "finished"]);
  });

  it("moving a finish date files the book under another year", () => {
    const id = useShelf.getState().books.find((b) => b.status === "finished")!.id;
    useShelf.getState().setFinishedAt(id, new Date(2024, 5, 1).getTime());
    expect(new Date(useShelf.getState().books.find((b) => b.id === id)!.finishedAt!).getFullYear()).toBe(2024);
  });

  it("keeps a goal per year", () => {
    useShelf.getState().setGoal(2025, 12);
    useShelf.getState().setGoal(2026, 30);
    expect(goalFor(useShelf.getState().goals, 2025)).toBe(12);
    expect(goalFor(useShelf.getState().goals, 2024)).toBe(24);
  });
});
