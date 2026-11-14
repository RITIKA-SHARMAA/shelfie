/**
 * The shelf is one plank, so it holds only what fits between the vase and the
 * pot. This decides how many books of each group stand on it. Books are added
 * one at a time, taking turns between groups, so no group crowds out the others.
 * Whatever doesn't fit is counted and shown as "+N" (all books are in the Library).
 */

export interface FitGroup {
  /** Widths of the group's books in shelf order (the face-out cover counts as one wide book). */
  widths: number[];
}

export const FIT = { gap: 2, groupGap: 24, label: 118, marker: 30 } as const;

function groupWidth(widths: number[], count: number): number {
  const books = widths.slice(0, count).reduce((s, w) => s + w, 0) + FIT.gap * Math.max(0, count - 1);
  const marker = count < widths.length ? FIT.marker : 0;
  return Math.max(FIT.label, books + marker);
}

export function shelfWidth(groups: FitGroup[], counts: number[]): number {
  const shown = groups.filter((g) => g.widths.length > 0);
  return (
    groups.reduce((s, g, i) => s + (g.widths.length ? groupWidth(g.widths, counts[i]) : 0), 0) +
    FIT.groupGap * Math.max(0, shown.length - 1)
  );
}

/** How many books of each group fit in `available` pixels. Every non-empty group shows at least one book. */
export function fitShelf(groups: FitGroup[], available: number): number[] {
  const counts = groups.map((g) => Math.min(1, g.widths.length));
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < groups.length; i++) {
      if (counts[i] >= groups[i].widths.length) continue;
      const next = counts.map((c, j) => (j === i ? c + 1 : c));
      if (shelfWidth(groups, next) <= available) {
        counts[i] += 1;
        added = true;
      }
    }
  }
  return counts;
}
