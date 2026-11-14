import { describe, expect, it } from "vitest";
import { addJournal, journalByMonth, journalLine, lastWeek, streak } from "../journal";
import type { JournalEntry } from "../types";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

describe("reading journal", () => {
  it("merges pages read on the same book on the same day", () => {
    let j: JournalEntry[] = [];
    j = addJournal(j, { bookId: "a", title: "Dune", kind: "read", pages: 10 }, at(2026, 10, 14, 9));
    j = addJournal(j, { bookId: "a", title: "Dune", kind: "read", pages: 15 }, at(2026, 10, 14, 21));
    j = addJournal(j, { bookId: "a", title: "Dune", kind: "read", pages: 5 }, at(2026, 10, 15, 9));
    expect(j.map((e) => e.pages)).toEqual([25, 5]);
    expect(journalLine(j[0])).toBe("Read 25 pages of Dune");
  });

  it("ignores zero or negative page counts", () => {
    expect(addJournal([], { bookId: "a", title: "Dune", kind: "read", pages: 0 })).toEqual([]);
  });

  it("counts a streak ending today or yesterday", () => {
    const j = [12, 13, 14].map((d) => ({ id: String(d), at: at(2026, 10, d), bookId: "a", title: "T", kind: "read" as const, pages: 5 }));
    expect(streak(j, at(2026, 10, 14, 20))).toBe(3);
    expect(streak(j, at(2026, 10, 15, 8))).toBe(3); // nothing yet today, the streak still stands
    expect(streak(j, at(2026, 10, 17))).toBe(0);
  });

  it("adding a book alone doesn't count as reading", () => {
    const j = [{ id: "1", at: at(2026, 10, 14), bookId: "a", title: "T", kind: "added" as const }];
    expect(streak(j, at(2026, 10, 14))).toBe(0);
  });

  it("summarises the last 7 days, oldest first", () => {
    const j = [{ id: "1", at: at(2026, 10, 14, 10), bookId: "a", title: "T", kind: "read" as const, pages: 30 }];
    const week = lastWeek(j, at(2026, 10, 14, 18));
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({ pages: 30, active: true });
    expect(week[0]).toMatchObject({ pages: 0, active: false });
  });

  it("groups a year by month, newest first", () => {
    const j = [
      { id: "1", at: at(2026, 0, 3), bookId: "a", title: "A", kind: "finished" as const },
      { id: "2", at: at(2026, 4, 3), bookId: "b", title: "B", kind: "started" as const },
      { id: "3", at: at(2025, 4, 3), bookId: "c", title: "C", kind: "started" as const },
    ];
    expect(journalByMonth(j, 2026).map((m) => m.month)).toEqual([4, 0]);
  });
});
