import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const get = (q: Record<string, string>, ip = "2.2.2.2") =>
  new Request(`http://localhost/api/book?${new URLSearchParams(q)}`, { headers: { "x-forwarded-for": ip } });

const searchDoc = {
  key: "/works/OL66554W",
  title: "Pride and Prejudice",
  author_name: ["Jane Austen"],
  first_publish_year: 1813,
  id_project_gutenberg: ["1342"],
  ebook_access: "public",
  ratings_average: 4.2,
  ratings_count: 416,
};

function fakeFetch(opts: { work?: unknown; gemini?: unknown }) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("generativelanguage"))
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(opts.gemini) }] } }] }));
    if (u.includes("search.json")) return new Response(JSON.stringify({ docs: [searchDoc] }));
    if (u.includes("/works/")) return new Response(JSON.stringify(opts.work ?? {}));
    return new Response("{}", { status: 404 });
  });
}

describe("GET /api/book", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns Open Library facts, the free-text id and the description", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch({ work: { type: { key: "/type/work" }, description: "A novel of manners about Elizabeth Bennet and Mr Darcy." } }),
    );
    const { GET } = await import("../route");
    const res = await GET(get({ title: "Pride and Prejudice", author: "Jane Austen" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      olKey: "/works/OL66554W",
      year: 1813,
      gutenbergId: "1342",
      ebookAccess: "public",
      rating: { average: 4.2, count: 416 },
      summarySource: "openlibrary",
    });
  });

  it("asks the AI for a labelled summary only when Open Library has no description", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const f = fakeFetch({
      work: { type: { key: "/type/work" } },
      gemini: { known: true, summary: "Elizabeth Bennet and Mr Darcy overcome pride and first impressions in Regency England." },
    });
    vi.stubGlobal("fetch", f);
    const { GET } = await import("../route");
    const data = await (await GET(get({ title: "Pride and Prejudice", author: "Jane Austen" }))).json();
    expect(data.summarySource).toBe("ai");
    expect(data.summary).toMatch(/^Elizabeth Bennet/);
  });

  it("leaves the summary empty when the AI doesn't know the book", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.stubGlobal("fetch", fakeFetch({ work: {}, gemini: { known: false, summary: "" } }));
    const { GET } = await import("../route");
    const data = await (await GET(get({ title: "Pride and Prejudice", author: "Jane Austen" }))).json();
    expect(data.summary).toBeNull();
  });

  it("rejects a bad work key", async () => {
    const { GET } = await import("../route");
    expect((await GET(get({ title: "X", key: "/authors/OL1A" }))).status).toBe(400);
    expect((await GET(get({ title: "" }))).status).toBe(400);
  });
});
