import { clientKey, fail } from "@/lib/http";
import { GUTENBERG_ID, MAX_TEXT_BYTES, gutenbergTextUrl, parseGutenberg } from "@/lib/gutenberg";
import { USER_AGENT } from "@/lib/openlibrary";
import { createRateLimiter } from "@/lib/rateLimit";

export const maxDuration = 30;

// Whole books are large, so each visitor can open a handful per minute. Answers are cached for a day.
const limiter = createRateLimiter(8, 60_000);

/** Public-domain text from Project Gutenberg, cleaned into paragraphs for the reader. Only numeric ids are accepted. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!GUTENBERG_ID.test(id)) return fail("invalid_input", 400);
  const rl = limiter.check(clientKey(req));
  if (!rl.ok) return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });

  try {
    const res = await fetch(gutenbergTextUrl(id), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 86_400 },
    } as RequestInit);
    if (res.status === 404) return fail("not_found", 404);
    if (!res.ok) throw new Error(`Gutenberg returned ${res.status}`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_TEXT_BYTES) return fail("too_large", 413);
    const raw = await res.text();
    if (raw.length > MAX_TEXT_BYTES) return fail("too_large", 413);
    const text = parseGutenberg(raw);
    if (text.paragraphs.length < 5) return fail("not_found", 404);
    return Response.json(text, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (err) {
    console.error("[text] failed:", err instanceof Error ? err.message : err);
    return fail("text_failed", 502);
  }
}
