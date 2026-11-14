import { generateJson } from "@/lib/gemini";
import { aiFailure, clientKey, fail } from "@/lib/http";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { createRateLimiter } from "@/lib/rateLimit";
import {
  CANDIDATES,
  SHOW,
  SYSTEM_PROMPT,
  buildUserPrompt,
  normalizeCandidates,
  rankByMood,
  recommendRequestSchema,
  responseSchema,
  verifyCandidates,
} from "@/lib/recommend";

export const maxDuration = 60;

// 6 rounds of suggestions per visitor per 10 minutes, per server instance.
const limiter = createRateLimiter(6, 10 * 60_000);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("invalid_input", 400);
  }
  const input = recommendRequestSchema.safeParse(body);
  if (!input.success) return fail("invalid_input", 400);
  if (!process.env.GEMINI_API_KEY) return fail("ai_unavailable", 503);

  const rl = limiter.check(clientKey(req));
  if (!rl.ok) return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });

  try {
    const { data, model } = await generateJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input.data),
      schema: responseSchema,
      // A little higher than default so "Suggest again" brings variety.
      temperature: 0.9,
      totalMs: 35_000,
    });
    const { finished, reading, want, exclude, seen, mood } = input.data;
    const shelf = [...finished, ...reading, ...want].map((b) => b.title).concat(exclude, seen);
    const candidates = normalizeCandidates(data, shelf);
    const verified = await verifyCandidates(candidates, (q) => searchOpenLibrary(q, 5, 6000), CANDIDATES);
    const picks = rankByMood(verified, mood).slice(0, SHOW);
    if (picks.length === 0) return fail("ai_failed", 502);
    return Response.json({ picks, model, checked: candidates.length });
  } catch (err) {
    return aiFailure(err, "recommend");
  }
}
