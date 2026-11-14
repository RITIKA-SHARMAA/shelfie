import { describe, expect, it } from "vitest";
import { countWord, finishedInYear, progressPct, season, yearStats } from "../stats";
import type { Book } from "../types";

let n = 0;
const book = (p: Partial<Book>): Book => ({
  id: String(++n),
  olKey: null,
  title: `Book ${n}`,
  author: "A",
  year: null,
  pages: 300,
  coverId: null,
  tags: [],
  status: "finished",
  currentPage: 300,
  rating: 0,
  notes: "",
  addedAt: 0,
  startedAt: 0,
  finishedAt: null,
  updatedAt: 0,
  ...p,
});
const at = (m: number, y = 2026) => new Date(y, m, 10).getTime();

describe("year stats", () => {
  const books = [
    book({ title: "A", pages: 200, finishedAt: at(0), rating: 4, tags: ["Fiction"] }),
    book({ title: "B", pages: 500, finishedAt: at(5), rating: 5, tags: ["Tech"] }),
    book({ title: "C", pages: 300, finishedAt: at(5), rating: 5, tags: ["Fiction"] }),
    book({ title: "Old", pages: 900, finishedAt: at(3, 2025), rating: 5 }),
    book({ title: "Reading", status: "reading", pages: 400, currentPage: 100, finishedAt: null }),
  ];

  it("counts only books finished in that year", () => {
    expect(finishedInYear(books, 2026).map((b) => b.title)).toEqual(["A", "B", "C"]);
  });

  it("totals pages, months, favourite, longest and top tag", () => {
    const s = yearStats(books, 2026);
    expect(s.pages).toBe(1000);
    expect(s.perMonth[0]).toBe(1);
    expect(s.perMonth[5]).toBe(2);
    expect(s.favourite?.title).toBe("C"); // tie on 5 stars, the later read wins
    expect(s.longest?.title).toBe("B");
    expect(s.topTag).toEqual({ tag: "Fiction", count: 2 });
  });

  it("handles an empty year", () => {
    const s = yearStats(books, 2020);
    expect(s.finished).toHaveLength(0);
    expect(s.favourite).toBeNull();
    expect(s.topTag).toBeNull();
  });
});

describe("helpers", () => {
  it("computes reading progress", () => {
    expect(progressPct({ status: "reading", currentPage: 206, pages: 320 })).toBe(64);
    expect(progressPct({ status: "finished", currentPage: 0, pages: 0 })).toBe(100);
    expect(progressPct({ status: "reading", currentPage: 50, pages: 0 })).toBe(0);
  });

  it("writes counts as words", () => {
    expect(countWord(0)).toBe("No");
    expect(countWord(1)).toBe("One");
    expect(countWord(18)).toBe("Eighteen");
    expect(countWord(40)).toBe("Forty");
    expect(countWord(42)).toBe("Forty-two");
    expect(countWord(120)).toBe("120");
  });

  it("names the season", () => {
    expect(season(new Date(2026, 10, 14))).toBe("Autumn");
    expect(season(new Date(2026, 0, 1))).toBe("Winter");
  });
});
