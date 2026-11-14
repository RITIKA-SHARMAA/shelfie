import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const get = (q: string) =>
  new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}`, { headers: { "x-forwarded-for": "1.1.1.1" } });

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns normalized results and identifies itself to Open Library", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ docs: [{ key: "/works/OL1W", title: "Dune", author_name: ["Frank Herbert"] }] })));
    vi.stubGlobal("fetch", f);
    const { GET } = await import("../route");
    const res = await GET(get("dune"));
    expect(res.status).toBe(200);
    expect((await res.json()).results[0]).toMatchObject({ olKey: "/works/OL1W", title: "Dune" });
    expect(f.mock.calls[0][1].headers["User-Agent"]).toContain("Shelfie");
  });

  it("400 for too-short queries and 502 when Open Library fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 500 })));
    const { GET } = await import("../route");
    expect((await GET(get("a"))).status).toBe(400);
    expect((await GET(get("dune"))).status).toBe(502);
  });
});
