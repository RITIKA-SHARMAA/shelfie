import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rateLimit";

describe("rate limiter", () => {
  it("allows up to the limit inside a window, then blocks with a retry time", () => {
    const rl = createRateLimiter(3, 60_000);
    expect(rl.check("a", 0).ok).toBe(true);
    expect(rl.check("a", 1).ok).toBe(true);
    expect(rl.check("a", 2)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = rl.check("a", 30_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(30);
  });

  it("tracks each visitor separately", () => {
    const rl = createRateLimiter(1, 60_000);
    expect(rl.check("a", 0).ok).toBe(true);
    expect(rl.check("b", 0).ok).toBe(true);
    expect(rl.check("a", 0).ok).toBe(false);
  });

  it("opens a fresh window after the old one expires", () => {
    const rl = createRateLimiter(1, 1000);
    rl.check("a", 0);
    expect(rl.check("a", 999).ok).toBe(false);
    expect(rl.check("a", 1000).ok).toBe(true);
  });
});
