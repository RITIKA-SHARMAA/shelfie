import { describe, expect, it } from "vitest";
import { buildUserPrompt, moodFit, normalizeCandidates, rankByMood, recommendRequestSchema, verifyCandidates } from "../recommend";
import type { BookResult } from "../types";

const result = (title: string, author: string, extra: Partial<BookResult> = {}): BookResult => ({
  olKey: `/works/${title}`,
  title,
  author,
  year: 2000,
  pages: 300,
  coverId: null,
  tags: [],
  ...extra,
});

describe("recommend request", () => {
  it("needs at least one finished or reading book", () => {
    expect(recommendRequestSchema.safeParse({ want: [{ title: "Dune" }] }).success).toBe(false);
    const ok = recommendRequestSchema.parse({ finished: [{ title: "Deep Work", author: "Cal Newport", rating: 5 }] });
    expect(ok.mood).toBe("any");
  });

  it("puts ratings, want list and exclusions in the prompt", () => {
    const p = buildUserPrompt(
      recommendRequestSchema.parse({
        finished: [{ title: "Deep Work", author: "Cal Newport", rating: 5 }],
        want: [{ title: "Dune" }],
        exclude: ["Sapiens"],
      }),
    );
    expect(p).toContain("Deep Work by Cal Newport (rated 5/5)");
    expect(p).toContain("do not suggest");
    expect(p).toContain("Sapiens");
  });
});

describe("normalizeCandidates", () => {
  it("drops blanks, duplicates and books already on the shelf", () => {
    const raw = {
      picks: [
        { title: "Digital Minimalism", author: "Cal Newport", reason: "Because Deep Work." },
        { title: "digital minimalism", author: "Cal Newport", reason: "dup" },
        { title: "Deep Work", author: "Cal Newport", reason: "already read" },
        { title: " ", author: "x", reason: "blank" },
        { title: "Indistractable", author: "Nir Eyal", reason: "Focus again." },
      ],
    };
    expect(normalizeCandidates(raw, ["Deep Work"]).map((c) => c.title)).toEqual(["Digital Minimalism", "Indistractable"]);
  });

  it("rejects the wrong shape", () => {
    expect(() => normalizeCandidates({ books: [] }, [])).toThrow();
  });
});

describe("verifyCandidates", () => {
  const catalogue: Record<string, BookResult[]> = {
    "Digital Minimalism Cal Newport": [result("Digital Minimalism", "Cal Newport", { coverId: 7 })],
    "Made Up Book Nobody": [result("Something Else", "Someone")],
    "The Hobbit Wrong Author": [result("The Hobbit", "J. R. R. Tolkien")],
  };
  const search = async (q: string) => {
    if (q.startsWith("Boom")) throw new Error("network");
    return catalogue[q] ?? [];
  };

  it("keeps only books Open Library confirms, with matching title and author", async () => {
    const picks = await verifyCandidates(
      [
        { title: "Digital Minimalism", author: "Cal Newport", reason: "r1" },
        { title: "Made Up Book", author: "Nobody", reason: "r2" },
        { title: "The Hobbit", author: "Wrong Author", reason: "r3" },
        { title: "Boom", author: "x", reason: "r4" },
      ],
      search,
    );
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({ title: "Digital Minimalism", coverId: 7, reason: "r1" });
  });

  it("returns at most the requested number", async () => {
    const many = Array.from({ length: 5 }, () => ({ title: "Digital Minimalism", author: "Cal Newport", reason: "r" }));
    expect(await verifyCandidates(many, search, 3)).toHaveLength(3);
  });
});

describe("moods", () => {
  const book = (title: string, tags: string[], pages: number | null, year: number | null) => result(title, "A", { tags, pages, year });

  it("scores a book against the mood from Open Library data", () => {
    expect(moodFit(book("Novel", ["Fiction"], 300, 2000), "story")).toBe(1);
    expect(moodFit(book("Habits", ["Self-help"], 300, 2000), "story")).toBe(-1);
    expect(moodFit(book("Habits", ["Self-help"], 300, 2000), "learn")).toBe(1);
    expect(moodFit(book("Brick", [], 900, 2000), "light")).toBe(-1);
    expect(moodFit(book("Old", [], null, 1813), "classic")).toBe(1);
    expect(moodFit(book("Untagged", [], null, null), "learn")).toBe(0);
  });

  it("puts books that fit first and drops clear misfits when enough remain", () => {
    const picks = [
      book("Self-help 1", ["Self-help"], 200, 2010),
      book("Novel 1", ["Fiction"], 300, 2010),
      book("Novel 2", ["Sci-fi"], 300, 2010),
      book("Untagged", [], 300, 2010),
    ];
    expect(rankByMood(picks, "story").map((p) => p.title)).toEqual(["Novel 1", "Novel 2", "Untagged"]);
    // Too few fits: keep everything, best first.
    expect(rankByMood(picks.slice(0, 2), "story").map((p) => p.title)).toEqual(["Novel 1", "Self-help 1"]);
  });

  it("lists earlier suggestions in the prompt for 'Suggest again'", () => {
    const p = buildUserPrompt(recommendRequestSchema.parse({ finished: [{ title: "Deep Work" }], mood: "classic", seen: ["Walden"] }));
    expect(p).toContain("Suggested before (suggest different books): Walden");
    expect(p).toContain("before 1970");
  });
});
