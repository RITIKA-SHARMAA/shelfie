import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

const gemini = (picks: unknown[]) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ picks }) }] } }] }));
const ol = (docs: unknown[]) => new Response(JSON.stringify({ docs }));

/** Routes fetch calls: Gemini gets the model answer, Open Library gets a catalogue lookup. */
function fakeFetch(picks: unknown[], catalogue: Record<string, unknown[]>) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("generativelanguage")) return gemini(picks);
    const q = new URL(u).searchParams.get("q") ?? "";
    return ol(catalogue[q] ?? []);
  });
}

const shelf = { finished: [{ title: "Deep Work", author: "Cal Newport", rating: 5 }], want: [{ title: "Dune", author: "Frank Herbert" }] };

describe("POST /api/recommend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns only suggestions that Open Library confirms and that aren't on the shelf", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch(
        [
          { title: "Digital Minimalism", author: "Cal Newport", reason: "Same author as Deep Work." },
          { title: "Dune", author: "Frank Herbert", reason: "already on want list" },
          { title: "A Book That Does Not Exist", author: "Nobody", reason: "made up" },
        ],
        {
          "Digital Minimalism Cal Newport": [
            { key: "/works/OL1W", title: "Digital Minimalism", author_name: ["Cal Newport"], cover_i: 5, first_publish_year: 2019 },
          ],
        },
      ),
    );
    const { POST } = await import("../route");
    const res = await POST(post(shelf));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.picks).toHaveLength(1);
    expect(data.picks[0]).toMatchObject({
      title: "Digital Minimalism",
      olKey: "/works/OL1W",
      coverId: 5,
      reason: "Same author as Deep Work.",
    });
  });

  it("502 when nothing can be verified", async () => {
    vi.stubGlobal("fetch", fakeFetch([{ title: "Imaginary", author: "Nobody", reason: "x" }], {}));
    const { POST } = await import("../route");
    expect((await POST(post(shelf))).status).toBe(502);
  });

  it("400 for an empty shelf, 503 without a key", async () => {
    const { POST } = await import("../route");
    expect((await POST(post({ want: [{ title: "Dune" }] }))).status).toBe(400);
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await POST(post(shelf))).status).toBe(503);
  });

  it("rate-limits each visitor", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch([{ title: "Digital Minimalism", author: "Cal Newport", reason: "r" }], {
        "Digital Minimalism Cal Newport": [{ key: "/works/OL1W", title: "Digital Minimalism", author_name: ["Cal Newport"] }],
      }),
    );
    const { POST } = await import("../route");
    for (let i = 0; i < 6; i++) expect((await POST(post(shelf))).status).toBe(200);
    expect((await POST(post(shelf))).status).toBe(429);
    expect((await POST(post(shelf, "2.2.2.2"))).status).toBe(200);
  });
});

describe("POST /api/recommend — moods and variety", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns up to 6 picks, books fitting the mood first, and never repeats earlier suggestions", async () => {
    const names = ["Novel A", "Guide B", "Novel C", "Novel D", "Novel E", "Novel F", "Novel G", "Seen Before"];
    const catalogue: Record<string, unknown[]> = {};
    names.forEach((n, i) => {
      catalogue[`${n} Writer`] = [
        { key: `/works/OL${i}W`, title: n, author_name: ["Writer"], subject: n.startsWith("Guide") ? ["Self-help"] : ["Fiction"] },
      ];
    });
    const f = fakeFetch(
      names.map((n) => ({ title: n, author: "Writer", reason: "Like Deep Work." })),
      catalogue,
    );
    vi.stubGlobal("fetch", f);
    const { POST } = await import("../route");
    const res = await POST(post({ ...shelf, mood: "story", seen: ["Seen Before"] }, "9.9.9.9"));
    const data = await res.json();
    expect(data.picks).toHaveLength(6);
    expect(data.picks.map((p: { title: string }) => p.title)).not.toContain("Seen Before");
    expect(data.picks.map((p: { title: string }) => p.title)).not.toContain("Guide B");
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(JSON.stringify(body)).toContain("Suggested before");
  });
});
