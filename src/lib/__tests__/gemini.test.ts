import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiError, answerText, generateJson, modelChain } from "../gemini";

const ok = (data: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }), { status: 200 });
const opts = { system: "s", user: "u", schema: { type: "OBJECT" } };
const timeoutErr = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });

describe("model chain", () => {
  it("starts with the lite model and can be overridden", () => {
    expect(modelChain({})).toEqual(["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"]);
    expect(modelChain({ GEMINI_MODEL: "x", GEMINI_FALLBACK_MODELS: " y , x " })).toEqual(["x", "y"]);
    expect(modelChain({ GEMINI_FALLBACK_MODELS: "" })).toEqual(["gemini-flash-lite-latest"]);
  });
});

describe("answerText", () => {
  it("skips thought parts and strips a code fence", () => {
    const body = { candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: '```json\n{"a":1}\n```' }] } }] };
    expect(answerText(body)).toBe('{"a":1}');
  });
  it("explains an empty answer", () => {
    expect(() => answerText({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] })).toThrow("SAFETY");
  });
});

describe("generateJson", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("needs a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateJson(opts)).rejects.toMatchObject({ code: "ai_unavailable" });
  });

  it("returns parsed JSON and the model, sending the key in a header and no thinking setting to lite", async () => {
    const f = vi.fn().mockResolvedValue(ok({ a: 1 }));
    vi.stubGlobal("fetch", f);
    await expect(generateJson(opts)).resolves.toEqual({ data: { a: 1 }, model: "gemini-flash-lite-latest" });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).not.toContain("k");
    expect(init.headers["x-goog-api-key"]).toBe("k");
    expect(JSON.parse(init.body).generationConfig.thinkingConfig).toBeUndefined();
  });

  it("falls back when a model is overloaded or slow", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockRejectedValueOnce(timeoutErr())
      .mockResolvedValueOnce(ok({ a: 2 }));
    vi.stubGlobal("fetch", f);
    await expect(generateJson(opts)).resolves.toEqual({ data: { a: 2 }, model: "gemini-2.5-flash" });
    // the full Flash model is asked to think less
    expect(JSON.parse(f.mock.calls[1][1].body).generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  it("retries without thinkingConfig when a model rejects it", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-flash-latest");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unknown name thinkingLevel", { status: 400 }))
      .mockResolvedValueOnce(ok({ a: 3 }));
    vi.stubGlobal("fetch", f);
    await expect(generateJson(opts)).resolves.toMatchObject({ data: { a: 3 } });
    expect(JSON.parse(f.mock.calls[1][1].body).generationConfig.thinkingConfig).toBeUndefined();
  });

  it("reports busy, timeout, rate limit and bad JSON distinctly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("{}", { status: 503 })),
    );
    await expect(generateJson(opts)).rejects.toMatchObject({ code: "ai_busy" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutErr()));
    await expect(generateJson(opts)).rejects.toMatchObject({ code: "ai_timeout" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(generateJson(opts)).rejects.toMatchObject({ code: "rate_limited" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }))),
    );
    await expect(generateJson(opts)).rejects.toBeInstanceOf(AiError);
  });
});
