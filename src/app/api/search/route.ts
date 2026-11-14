import { clientKey, fail } from "@/lib/http";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { createRateLimiter } from "@/lib/rateLimit";

// Searching is cheap but still proxied: one place to set Open Library's
// requested User-Agent, cache answers, and stop abuse.
const limiter = createRateLimiter(60, 60_000);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return fail("invalid_input", 400);
  const rl = limiter.check(clientKey(req));
  if (!rl.ok) return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });
  try {
    const results = await searchOpenLibrary(q, 10);
    return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    console.error("[search] failed:", err instanceof Error ? err.message : err);
    return fail("search_failed", 502);
  }
}
