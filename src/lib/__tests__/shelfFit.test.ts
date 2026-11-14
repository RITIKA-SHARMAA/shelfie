import { describe, expect, it } from "vitest";
import { FIT, fitShelf, shelfWidth } from "../shelfFit";

const g = (n: number, w = 30) => ({ widths: Array.from({ length: n }, () => w) });

describe("fitShelf", () => {
  it("shows everything when there's room", () => {
    expect(fitShelf([g(2), g(3), g(4)], 2000)).toEqual([2, 3, 4]);
  });

  it("never goes past the available width and shares space between groups", () => {
    const groups = [g(3), g(20), g(30)];
    const counts = fitShelf(groups, 700);
    expect(shelfWidth(groups, counts)).toBeLessThanOrEqual(700);
    expect(counts[1]).toBeGreaterThan(3);
    expect(counts[2]).toBeGreaterThan(3);
    expect(Math.abs(counts[1] - counts[2])).toBeLessThanOrEqual(1);
  });

  it("keeps at least one book of every group, and skips empty groups", () => {
    expect(fitShelf([g(5), g(0), g(5)], 10)).toEqual([1, 0, 1]);
  });

  it("leaves room for the +N marker", () => {
    const groups = [g(10, 40)];
    const counts = fitShelf(groups, 300);
    const shown = counts[0] * 40 + (counts[0] - 1) * FIT.gap + FIT.marker;
    expect(shown).toBeLessThanOrEqual(300);
  });
});
