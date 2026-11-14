import type { JournalEntry, JournalKind } from "./types";

/**
 * The reading journal: a short log of what happened on the shelf (added,
 * started, pages read, finished). It powers the streak, the week strip and the
 * journal on the Year page. Pure functions, so they're easy to test.
 */

export const JOURNAL_MAX = 400;
const DAY = 86_400_000;

export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

let counter = 0;
const entryId = (at: number) => `${at.toString(36)}-${(counter++).toString(36)}`;

/** Add an entry. Pages read on the same book on the same day merge into one line. */
export function addJournal(
  journal: JournalEntry[],
  e: { bookId: string; title: string; kind: JournalKind; pages?: number },
  now = Date.now(),
): JournalEntry[] {
  if (e.kind === "read") {
    if (!e.pages || e.pages <= 0) return journal;
    const i = journal.findIndex((j) => j.kind === "read" && j.bookId === e.bookId && dayKey(j.at) === dayKey(now));
    if (i >= 0) {
      const next = [...journal];
      next[i] = { ...next[i], at: now, pages: (next[i].pages ?? 0) + e.pages };
      return next;
    }
  }
  const entry: JournalEntry = { id: entryId(now), at: now, ...e };
  return [...journal, entry].slice(-JOURNAL_MAX);
}

const ACTIVE: JournalKind[] = ["started", "read", "finished"];

/** Days in a row with some reading, ending today (or yesterday, so the streak survives until tonight). */
export function streak(journal: JournalEntry[], now = Date.now()): number {
  const days = new Set(journal.filter((j) => ACTIVE.includes(j.kind)).map((j) => dayKey(j.at)));
  let d = days.has(dayKey(now)) ? now : now - DAY;
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d -= DAY;
  }
  return n;
}

/** The last 7 days, oldest first, with pages read and whether anything happened. */
export function lastWeek(journal: JournalEntry[], now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const ts = now - (6 - i) * DAY;
    const key = dayKey(ts);
    const items = journal.filter((j) => dayKey(j.at) === key);
    return {
      ts,
      pages: items.reduce((s, j) => s + (j.kind === "read" ? (j.pages ?? 0) : 0), 0),
      active: items.some((j) => ACTIVE.includes(j.kind)),
    };
  });
}

/** A year's journal, newest first, grouped by month. */
export function journalByMonth(journal: JournalEntry[], year: number) {
  const months = new Map<number, JournalEntry[]>();
  for (const j of [...journal].sort((a, b) => b.at - a.at)) {
    const d = new Date(j.at);
    if (d.getFullYear() !== year) continue;
    const m = d.getMonth();
    months.set(m, [...(months.get(m) ?? []), j]);
  }
  return [...months.entries()].map(([month, items]) => ({ month, items }));
}

export function journalLine(j: JournalEntry): string {
  switch (j.kind) {
    case "added":
      return `Added ${j.title}`;
    case "started":
      return `Started ${j.title}`;
    case "read":
      return `Read ${j.pages} page${j.pages === 1 ? "" : "s"} of ${j.title}`;
    case "finished":
      return `Finished ${j.title}`;
  }
}
