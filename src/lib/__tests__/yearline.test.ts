import { describe, expect, it } from "vitest";
import { buildUserPrompt, fallbackLine, normalizeLine, yearLineRequestSchema } from "../yearline";

describe("year line", () => {
  it("cleans the model's sentence", () => {
    expect(normalizeLine({ line: '"A year of better habits\nand great stories"' })).toBe("A year of better habits and great stories.");
    expect(normalizeLine({ line: "Short." })).toBeNull();
    expect(normalizeLine({ nope: 1 })).toBeNull();
  });

  it("trims long lines at a word boundary", () => {
    const long = "word ".repeat(60);
    const out = normalizeLine({ line: long })!;
    expect(out.length).toBeLessThanOrEqual(141);
    expect(out.endsWith("word.")).toBe(true);
  });

  it("builds a prompt from the year's numbers", () => {
    const p = buildUserPrompt(
      yearLineRequestSchema.parse({ year: 2026, count: 9, pages: 2525, favourite: "Deep Work", topTag: "Self-help" }),
    );
    expect(p).toContain("Books finished: 9");
    expect(p).toContain("Favourite: Deep Work");
  });

  it("has a plain fallback for every case", () => {
    expect(fallbackLine({ count: 0 })).toMatch(/first finished book/);
    expect(fallbackLine({ count: 1, topTag: "Fiction" })).toBe("1 book finished, mostly fiction.");
    expect(fallbackLine({ count: 9, favourite: "Deep Work" })).toBe("9 books finished, with Deep Work as the favourite.");
  });
});
