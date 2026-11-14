import { generateJson } from "@/lib/gemini";
import { aiFailure, clientKey, fail } from "@/lib/http";
import { createRateLimiter } from "@/lib/rateLimit";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeLine, responseSchema, yearLineRequestSchema } from "@/lib/yearline";

export const maxDuration = 60;

const limiter = createRateLimiter(6, 10 * 60_000);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("invalid_input", 400);
  }
  const input = yearLineRequestSchema.safeParse(body);
  if (!input.success) return fail("invalid_input", 400);
  if (!process.env.GEMINI_API_KEY) return fail("ai_unavailable", 503);

  const rl = limiter.check(clientKey(req));
  if (!rl.ok) return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });

  try {
    const { data, model } = await generateJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input.data),
      schema: responseSchema,
      temperature: 0.8,
    });
    const line = normalizeLine(data);
    if (!line) return fail("ai_failed", 502);
    return Response.json({ line, model });
  } catch (err) {
    return aiFailure(err, "year-line");
  }
}
