import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const raw = readFileSync(fileURLToPath(new URL("../../../../lib/__tests__/fixtures/pride-excerpt.txt", import.meta.url)), "utf8");
const get = (id: string, ip = "3.3.3.3") =>
  new Request(`http://localhost/api/text?id=${encodeURIComponent(id)}`, { headers: { "x-forwarded-for": ip } });

describe("GET /api/text", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches the Gutenberg file and returns clean paragraphs", async () => {
    const f = vi.fn(async () => new Response(raw));
    vi.stubGlobal("fetch", f);
    const { GET } = await import("../route");
    const res = await GET(get("1342"));
    expect(res.status).toBe(200);
    expect(String((f.mock.calls[0] as unknown[])[0])).toBe("https://www.gutenberg.org/cache/epub/1342/pg1342.txt");
    const data = await res.json();
    expect(data.paragraphs[data.start]).toBe("Chapter I.");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });

  it("only accepts numeric ids, so nothing else can be fetched", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { GET } = await import("../route");
    expect((await GET(get("../../etc/passwd"))).status).toBe(400);
    expect((await GET(get("https://evil.example"))).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it("reports a missing book and upstream errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    let { GET } = await import("../route");
    expect((await GET(get("999999"))).status).toBe(404);
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("err", { status: 500 })),
    );
    ({ GET } = await import("../route"));
    expect((await GET(get("1342", "4.4.4.4"))).status).toBe(502);
  });

  it("rate-limits each visitor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(raw)),
    );
    const { GET } = await import("../route");
    for (let i = 0; i < 8; i++) await GET(get("1342", "5.5.5.5"));
    expect((await GET(get("1342", "5.5.5.5"))).status).toBe(429);
  });
});
