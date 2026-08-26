/**
 * Simple in-memory rate limiter for auth endpoints.
 * Limits per-IP to prevent brute force and signup abuse.
 * Note: Cloudflare Workers isolates are per-request, so this is a best-effort
 * limiter — the Cloudflare rate limit binding (API_RATE_LIMITER) provides
 * the real distributed protection.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkAuthRateLimit(ip: string, action: string, max: number, windowMs: number): { limited: boolean; retryAfter?: number } {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false };
  }

  bucket.count++;
  if (bucket.count > max) {
    return { limited: true, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { limited: false };
}

export function getClientIP(req: Request): string {
  const headers = req.headers;
  return headers.get('cf-connecting-ip') ||
         headers.get('x-real-ip') ||
         headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         'unknown';
}
