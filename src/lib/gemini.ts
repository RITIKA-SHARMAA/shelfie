/**
 * One place that talks to Gemini, used by both AI routes.
 *
 * Lessons from production use of the free tier are built in:
 * - Start with the fast lite model; plenty for short structured answers.
 * - Give each model its own time limit, so one slow model can't eat the budget.
 * - On "high demand" (503), a missing model (404) or a timeout, try the next.
 * - Full Flash models "think" by default, which is slow; ask them for a low
 *   thinking level, and retry without it if a model rejects the setting.
 * - Ask for JSON with a response schema; the caller still validates it.
 */

export const DEFAULT_MODEL = "gemini-flash-lite-latest";
export const DEFAULT_FALLBACKS = ["gemini-flash-latest", "gemini-2.5-flash"];

export function modelChain(env: Record<string, string | undefined> = process.env): string[] {
  const primary = env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = env.GEMINI_FALLBACK_MODELS !== undefined ? env.GEMINI_FALLBACK_MODELS.split(",") : DEFAULT_FALLBACKS;
  return [...new Set([primary, ...fallbacks].map((m) => m.trim()).filter(Boolean))];
}

export type AiErrorCode = "ai_unavailable" | "rate_limited" | "ai_busy" | "ai_timeout" | "ai_failed";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const AI_STATUS: Record<AiErrorCode, number> = {
  ai_unavailable: 503,
  rate_limited: 429,
  ai_busy: 503,
  ai_timeout: 504,
  ai_failed: 502,
};

interface Options {
  system: string;
  user: string;
  schema: object;
  temperature?: number;
  totalMs?: number;
  attemptMs?: number;
}

const TRY_NEXT = new Set([404, 500, 503, 504]);

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError" || /timeout|aborted/i.test(err.message));
}

/** Text of the answer, skipping any "thought" parts a thinking model adds. */
export function answerText(body: unknown): string {
  const cand = (body as { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] })
    ?.candidates?.[0];
  const text = cand?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new AiError("ai_failed", `Empty response from model${cand?.finishReason ? ` (${cand.finishReason})` : ""}.`);
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

/** Calls Gemini down the model chain and returns the parsed JSON answer plus the model that gave it. */
export async function generateJson(opts: Options): Promise<{ data: unknown; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("ai_unavailable", "GEMINI_API_KEY is not set.");
  const totalMs = opts.totalMs ?? 45_000;
  const attemptMs = opts.attemptMs ?? 14_000;
  const deadline = Date.now() + totalMs;
  let sawBusy = false;
  let sawTimeout = false;

  for (const model of modelChain()) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < 3000) break;
    const attemptDeadline = Date.now() + Math.min(attemptMs, timeLeft);
    try {
      const res = await callModel(model, apiKey, opts, attemptDeadline);
      if (res.ok) {
        const text = answerText(await res.json());
        try {
          return { data: JSON.parse(text), model };
        } catch {
          throw new AiError("ai_failed", `Model returned invalid JSON: ${text.slice(0, 120)}`);
        }
      }
      if (res.status === 429) throw new AiError("rate_limited", "Gemini quota or rate limit reached.");
      const detail = (await res.text()).slice(0, 300);
      if (TRY_NEXT.has(res.status)) {
        sawBusy ||= res.status === 503;
        console.warn(`[gemini] ${model} returned ${res.status}, trying next model`, detail);
        continue;
      }
      throw new AiError("ai_failed", `${model} error ${res.status}: ${detail}`);
    } catch (err) {
      if (err instanceof AiError) throw err;
      if (isTimeout(err)) {
        sawTimeout = true;
        console.warn(`[gemini] ${model} timed out, trying next model`);
        continue;
      }
      throw new AiError("ai_failed", err instanceof Error ? err.message : String(err));
    }
  }
  if (sawBusy) throw new AiError("ai_busy", "Every model is overloaded right now.");
  if (sawTimeout) throw new AiError("ai_timeout", "Every model timed out.");
  throw new AiError("ai_failed", "No model could answer.");
}

async function callModel(model: string, apiKey: string, opts: Options, deadline: number): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const send = (withThinking: boolean) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.6,
          responseMimeType: "application/json",
          responseSchema: opts.schema,
          ...(withThinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
        },
      }),
      signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
    });

  // Lite models already default to minimal thinking, so leave them alone.
  const res = await send(!/lite/i.test(model));
  if (res.status !== 400) return res;
  const text = await res.text();
  if (/thinking/i.test(text)) {
    console.warn(`[gemini] ${model} rejected thinkingConfig, retrying without it`);
    return send(false);
  }
  return new Response(text, { status: 400 });
}
