import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = (body: unknown) =>
  new Request("http://localhost/api/year-line", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const gemini = (line: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ line }) }] } }] }));

describe("POST /api/year-line", () => {
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

  it("returns one cleaned sentence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(gemini('"A year of habits and stories"')));
    const { POST } = await import("../route");
    const res = await POST(post({ year: 2026, count: 9, pages: 2525 }));
    expect(await res.json()).toMatchObject({ line: "A year of habits and stories." });
  });

  it("502 when the line is unusable, 400 for bad input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(gemini("ok")));
    const { POST } = await import("../route");
    expect((await POST(post({ year: 2026, count: 9, pages: 2525 }))).status).toBe(502);
    expect((await POST(post({ year: "x" }))).status).toBe(400);
  });
});
