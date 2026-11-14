/**
 * Fixed-window rate limiter kept in memory.
 *
 * On Vercel each serverless instance has its own memory, so this limits per
 * instance rather than globally. That is enough to stop one visitor from
 * draining the free AI quota by accident. A shared store (e.g. Redis) would be
 * the next step if the app needed a hard global limit.
 */
export interface RateLimiter {
  check(key: string, now?: number): { ok: boolean; retryAfterSec: number; remaining: number };
}

export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5000): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      let entry = hits.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
        if (hits.size > maxKeys) {
          // Drop expired entries so memory stays bounded.
          for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
        }
      }
      if (entry.count >= limit) {
        return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000), remaining: 0 };
      }
      entry.count += 1;
      return { ok: true, retryAfterSec: 0, remaining: limit - entry.count };
    },
  };
}
