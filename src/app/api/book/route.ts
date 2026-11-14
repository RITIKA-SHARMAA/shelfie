import {
  DETAIL_FIELDS,
  SUMMARY_SYSTEM,
  buildDetails,
  detailsQuerySchema,
  fetchWork,
  normalizeSummary,
  pickDoc,
  summaryPrompt,
  summarySchema,
} from "@/lib/bookinfo";
import { generateJson } from "@/lib/gemini";
import { clientKey, fail } from "@/lib/http";
import { olJson, searchUrl } from "@/lib/openlibrary";
import { createRateLimiter } from "@/lib/rateLimit";

export const maxDuration = 30;

// Opening books is frequent, so the limit is generous; AI summaries are only made when Open Library has no description.
const limiter = createRateLimiter(40, 60_000);

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const input = detailsQuerySchema.safeParse(params);
  if (!input.success) return fail("invalid_input", 400);
  const rl = limiter.check(clientKey(req));
  if (!rl.ok) return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });

  const { key, title, author } = input.data;
  let doc = null;
  try {
    doc = pickDoc(await olJson(searchUrl(`${title} ${author}`.trim(), 6, DETAIL_FIELDS), 7000), { key, title, author });
  } catch (err) {
    console.error("[book] search failed:", err instanceof Error ? err.message : err);
  }
  const workKey = doc?.key ?? key;
  let work = null;
  if (workKey) {
    try {
      work = await fetchWork(workKey, (url) => olJson(url, 7000));
    } catch (err) {
      console.error("[book] work failed:", err instanceof Error ? err.message : err);
    }
  }
  if (!doc && !work) return fail("not_found", 404);

  const details = buildDetails(doc, work, { key, title, author });

  // No description on Open Library: ask the AI for a short summary, clearly labelled in the UI.
  if (!details.summary && process.env.GEMINI_API_KEY) {
    try {
      const { data } = await generateJson({
        system: SUMMARY_SYSTEM,
        user: summaryPrompt(details),
        schema: summarySchema,
        temperature: 0.3,
        totalMs: 18_000,
        attemptMs: 9_000,
      });
      const summary = normalizeSummary(data);
      if (summary) Object.assign(details, { summary, summarySource: "ai" });
    } catch (err) {
      console.error("[book] summary failed:", err instanceof Error ? err.message : err);
    }
  }

  return Response.json(details, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
