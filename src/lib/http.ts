import { AI_STATUS, AiError, type AiErrorCode } from "./gemini";

export function clientKey(req: Request): string {
  // Vercel sets x-forwarded-for; the first address is the visitor.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
}

export function fail(code: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: code }, { status, headers });
}

/** Map anything thrown by an AI route to a JSON error, logging the detail server-side only. */
export function aiFailure(err: unknown, route: string): Response {
  if (err instanceof AiError) {
    if (err.code !== "ai_unavailable") console.error(`[${route}] ${err.code}: ${err.message}`);
    return fail(err.code, AI_STATUS[err.code as AiErrorCode]);
  }
  console.error(`[${route}] failed:`, err instanceof Error ? err.message : err);
  return fail("ai_failed", 502);
}
