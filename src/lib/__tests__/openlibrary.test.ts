import { describe, expect, it } from "vitest";
import { normTitle, normalizeDoc, normalizeSearch, sameAuthor, sameTitle, searchUrl } from "../openlibrary";

describe("Open Library helpers", () => {
  it("builds a search URL that asks only for the fields we use", () => {
    const u = new URL(searchUrl("deep work", 5));
    expect(u.hostname).toBe("openlibrary.org");
    expect(u.searchParams.get("q")).toBe("deep work");
    expect(u.searchParams.get("limit")).toBe("5");
    expect(u.searchParams.get("fields")).toContain("cover_i");
  });

  it("normalizes a search document", () => {
    const r = normalizeDoc({
      key: "/works/OL1W",
      title: " Dune ",
      author_name: ["Frank Herbert"],
      first_publish_year: 1965,
      cover_i: 123,
      number_of_pages_median: 604,
      subject: ["Science fiction"],
    });
    expect(r).toEqual({
      olKey: "/works/OL1W",
      title: "Dune",
      author: "Frank Herbert",
      year: 1965,
      pages: 604,
      coverId: 123,
      tags: ["Sci-fi", "Fiction"],
      gutenbergId: null,
    });
  });

  it("keeps a valid Project Gutenberg id so the book can be read in the app", () => {
    const base = { key: "/works/OL66554W", title: "Pride and Prejudice", author_name: ["Jane Austen"] };
    expect(normalizeDoc({ ...base, id_project_gutenberg: ["1342", "42671"] })?.gutenbergId).toBe("1342");
    expect(normalizeDoc({ ...base, id_project_gutenberg: ["../etc", "abc"] })?.gutenbergId).toBeNull();
  });

  it("drops malformed or non-work results and duplicates", () => {
    const docs = [
      { key: "/works/OL1W", title: "A" },
      { key: "/works/OL1W", title: "A" },
      { key: "/authors/OL2A", title: "B" },
      { title: "no key" },
    ];
    expect(normalizeSearch({ docs }).map((r) => r.olKey)).toEqual(["/works/OL1W"]);
    expect(normalizeSearch({})).toEqual([]);
  });

  it("fills an unknown author", () => {
    expect(normalizeDoc({ key: "/works/OL9W", title: "X" })?.author).toBe("Unknown author");
  });

  it("matches titles ignoring case, subtitles and articles", () => {
    expect(normTitle("The Almanack of Naval Ravikant: A Guide to Wealth")).toBe("almanack of naval ravikant");
    expect(sameTitle("Digital Minimalism", "Digital minimalism: choosing a focused life")).toBe(true);
    expect(sameTitle("The Hobbit", "Hobbit")).toBe(true);
    expect(sameTitle("Dune", "Dune Messiah")).toBe(false);
    expect(sameTitle("", "Anything")).toBe(false);
  });

  it("matches authors by surname", () => {
    expect(sameAuthor("Cal Newport", "Newport, Cal".split(", ").reverse().join(" "))).toBe(true);
    expect(sameAuthor("J. R. R. Tolkien", "John Ronald Reuel Tolkien")).toBe(true);
    expect(sameAuthor("Cal Newport", "Matt Haig")).toBe(false);
  });
});
