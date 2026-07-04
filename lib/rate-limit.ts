import { headers } from "next/headers";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Fixed-window rate limiter backed by Postgres — durable and shared across all
 * serverless instances (in-memory limiting can't do that on Vercel).
 *
 * The whole check is one atomic INSERT … ON CONFLICT: it resets the window if it
 * has expired, otherwise increments. Fails OPEN — a DB blip must never lock users out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const rows = await db.$queryRawUnsafe<
      { count: number; window_start: Date }[]
    >(
      `INSERT INTO "RateLimit" (key, count, "windowStart")
       VALUES ($1, 1, now())
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN "RateLimit"."windowStart" < now() - ($2 || ' seconds')::interval
                      THEN 1 ELSE "RateLimit".count + 1 END,
         "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - ($2 || ' seconds')::interval
                              THEN now() ELSE "RateLimit"."windowStart" END
       RETURNING count, "windowStart" AS window_start`,
      key,
      windowSeconds
    );

    const row = rows[0];
    const count = Number(row.count);
    if (count > limit) {
      const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
      };
    }
    return { ok: true, retryAfterSeconds: 0 };
  } catch {
    return { ok: true, retryAfterSeconds: 0 };
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Human phrasing for a retry-after delay, e.g. "about 3 minutes". */
export function retryPhrase(seconds: number): string {
  if (seconds >= 90) return `about ${Math.ceil(seconds / 60)} minutes`;
  if (seconds >= 45) return "about a minute";
  return `${seconds} seconds`;
}
