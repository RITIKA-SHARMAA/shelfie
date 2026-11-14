import { describe, expect, it } from "vitest";
import { awardsFromSubjects, buildDetails, cleanDescription, fetchWork, normalizeSummary, pickDoc, themesFromSubjects } from "../bookinfo";

const dune = {
  key: "/works/OL893414W",
  title: "Dune",
  author_name: ["Frank Herbert"],
  first_publish_year: 1965,
  ratings_average: 4.256,
  ratings_count: 900,
  ebook_access: "borrowable",
  first_sentence: [
    "In the week before their departure to Arrakis, when all the final scurrying about had reached a nearly unbearable frenzy.",
  ],
};

describe("pickDoc", () => {
  it("prefers the exact work key, then title and author", () => {
    const body = { docs: [{ key: "/works/OL1W", title: "Dune Messiah", author_name: ["Frank Herbert"] }, dune] };
    expect(pickDoc(body, { key: "/works/OL893414W", title: "x", author: "" })?.key).toBe("/works/OL893414W");
    expect(pickDoc(body, { title: "Dune", author: "Frank Herbert" })?.key).toBe("/works/OL893414W");
    expect(pickDoc(body, { title: "Dune", author: "Someone Else" })?.key).toBe("/works/OL893414W"); // exact title as fallback
    expect(pickDoc(body, { title: "Unknown Book", author: "" })).toBeNull();
  });
});

describe("cleanDescription", () => {
  it("accepts strings or { value } and strips links and source notes", () => {
    const raw = {
      value:
        "A **great** story about [spice](https://x.y) on a desert planet, told with care. ([source][1])\r\n\r\n----------\n[1]: https://x",
    };
    expect(cleanDescription(raw)).toBe("A great story about spice on a desert planet, told with care.");
  });
  it("cuts long text at a sentence end", () => {
    const long = "One sentence that is fairly long. ".repeat(40);
    const out = cleanDescription(long, 200)!;
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith(".")).toBe(true);
  });
  it("returns null when there's nothing useful", () => {
    expect(cleanDescription(undefined)).toBeNull();
    expect(cleanDescription("Too short.")).toBeNull();
  });
});

describe("subjects", () => {
  const subjects = [
    "Fiction",
    "Science fiction",
    "award:hugo_award=1966",
    "nyt:mass-market=2021",
    "Dune (Imaginary place)",
    "Ecology",
    "Ecology",
  ];
  it("keeps readable themes only", () => {
    expect(themesFromSubjects(subjects)).toEqual(["Science fiction", "Ecology"]);
  });
  it("turns award codes into names", () => {
    expect(awardsFromSubjects(subjects)).toEqual(["Hugo Award"]);
  });
});

describe("buildDetails", () => {
  it("combines search and work data", () => {
    const d = buildDetails(
      dune,
      { description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.", subjects: ["Ecology"] },
      { title: "Dune", author: "" },
    );
    expect(d).toMatchObject({
      olKey: "/works/OL893414W",
      year: 1965,
      rating: { average: 4.3, count: 900 },
      summarySource: "openlibrary",
      ebookAccess: "borrowable",
      gutenbergId: null,
      themes: ["Ecology"],
    });
    expect(d.firstSentence).toMatch(/^In the week before/);
  });
  it("hides ratings from fewer than 3 people", () => {
    expect(buildDetails({ ...dune, ratings_count: 2 }, null, { title: "Dune", author: "" }).rating).toBeNull();
  });
});

describe("fetchWork", () => {
  it("follows one redirect to the merged work", async () => {
    const pages: Record<string, unknown> = {
      "https://openlibrary.org/works/OL893415W.json": { type: { key: "/type/redirect" }, location: "/works/OL893414W" },
      "https://openlibrary.org/works/OL893414W.json": {
        type: { key: "/type/work" },
        description: "Desert planet.",
        subjects: ["Ecology", 5],
      },
    };
    const w = await fetchWork("/works/OL893415W", async (u) => pages[u]);
    expect(w).toEqual({ description: "Desert planet.", subjects: ["Ecology"] });
  });
});

describe("normalizeSummary", () => {
  it("accepts only summaries the model says it knows", () => {
    expect(normalizeSummary({ known: false, summary: "Something invented about a book it doesn't know at all." })).toBeNull();
    expect(normalizeSummary({ known: true, summary: "short" })).toBeNull();
    expect(
      normalizeSummary({
        known: true,
        summary: "  A young heir must survive betrayal on a desert world that holds the universe's most precious resource. ",
      }),
    ).toMatch(/^A young heir/);
  });
});
