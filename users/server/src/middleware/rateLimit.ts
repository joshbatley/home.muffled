import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/bun";
import { createMiddleware } from "hono/factory";

type Bucket = { count: number; resetAt: number };

export function rateLimit(opts: { windowMs: number; max: number }): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();
  return createMiddleware(async (c, next) => {
    const ip =
      getConnInfo(c).remote.address ?? c.req.header("x-forwarded-for") ?? "unknown";
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const b = buckets.get(key);

    if (!b || now >= b.resetAt) {
      if (buckets.size > 10_000) {
        for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
      }
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else if (b.count >= opts.max) {
      c.header("Retry-After", String(Math.ceil((b.resetAt - now) / 1000)));
      return c.json({ error: "too many requests" }, 429);
    } else {
      b.count++;
    }

    await next();
  });
}
