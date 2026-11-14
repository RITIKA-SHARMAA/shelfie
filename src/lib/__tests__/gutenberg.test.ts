import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GUTENBERG_ID, pageOf, paginate, parseGutenberg } from "../gutenberg";

// A real excerpt of Project Gutenberg's Pride and Prejudice (#1342): licence header, illustration notes, two chapters, footer.
const raw = readFileSync(fileURLToPath(new URL("./fixtures/pride-excerpt.txt", import.meta.url)), "utf8");

describe("parseGutenberg", () => {
  const t = parseGutenberg(raw);

  it("drops the licence header and footer", () => {
    expect(t.paragraphs.join(" ")).not.toMatch(/PROJECT GUTENBERG/i);
  });

  it("skips illustration notes, even when they span several blocks", () => {
    expect(t.paragraphs.some((p) => p.includes("[Illustration") || p.includes("GEORGE ALLEN"))).toBe(false);
  });

  it("finds chapter headings and starts at Chapter I", () => {
    expect(t.headings.map((h) => t.paragraphs[h])).toEqual(["Chapter I.", "CHAPTER II."]);
    expect(t.paragraphs[t.start]).toBe("Chapter I.");
    expect(t.paragraphs[t.start + 1]).toMatch(/^It is a truth universally acknowledged/);
  });

  it("joins wrapped lines into whole paragraphs", () => {
    expect(t.paragraphs[t.start + 1]).toBe(
      "It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.",
    );
  });

  it("only accepts numeric ids", () => {
    expect(GUTENBERG_ID.test("1342")).toBe(true);
    expect(GUTENBERG_ID.test("1342/../../x")).toBe(false);
  });
});

describe("paginate", () => {
  const text = {
    paragraphs: ["Chapter 1", "a".repeat(300), "b".repeat(300), "Chapter 2", "c".repeat(900)],
    headings: [0, 3],
  };

  it("starts every chapter on a new page and splits long paragraphs", () => {
    const pages = paginate(text, 500);
    expect(pages[0].items[0].text).toBe("Chapter 1");
    const ch2 = pages.findIndex((p) => p.items[0].text === "Chapter 2");
    expect(ch2).toBeGreaterThan(0);
    expect(pages.every((p) => p.items.reduce((s, i) => s + i.text.length, 0) <= 1000)).toBe(true);
  });

  it("finds the page holding a paragraph", () => {
    const pages = paginate(text, 500);
    expect(pages[pageOf(pages, 3)].items[0].text).toBe("Chapter 2");
    expect(pageOf(pages, 0)).toBe(0);
  });
});

describe("chapter styles", () => {
  it("starts at a bare roman numeral or 'THE FIRST BOOK' heading", () => {
    const roman = parseGutenberg("Title page\n\nby Someone\n\nI\n\nIn my younger years.\n\nII\n\nMore text here.");
    expect(roman.paragraphs[roman.start]).toBe("I");
    const books = parseGutenberg(
      "Introduction\n\nSome notes.\n\nTHE FIRST BOOK\n\nOf my grandfather.\n\nTHE SECOND BOOK\n\nBegin the morning.",
    );
    expect(books.headings.map((h) => books.paragraphs[h])).toEqual(["THE FIRST BOOK", "THE SECOND BOOK"]);
    expect(books.paragraphs[books.start]).toBe("THE FIRST BOOK");
  });
});
