import { NextRequest, NextResponse } from 'next/server';

// ── Types ──

interface RateLimitConfig {
  // Maximum requests per window
  max: number;
  // Window size in milliseconds
  windowMs: number;
  // Key prefix for the bucket (e.g. "api", "mcp", "auth")
  prefix: string;
}

// ── In-memory fallback (per-isolate) ──
// On Cloudflare Workers, each isolate has its own memory.
// The Cloudflare rate-limit binding provides true distributed protection.
// This in-memory limiter is a best-effort fallback for local dev and
// cases where the binding is not configured.

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkInMemory(key: string, max: number, windowMs: number): { limited: boolean; retryAfter?: number } {
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

// ── Cloudflare rate-limit binding ──
// The binding is declared in wrangler.toml as:
//   [[unsafe.bindings]]
//   name = "API_RATE_LIMITER"
//   type = "ratelimit"
//   namespace_id = "1001"
//   simple = { limit = 100, period = 60 }

interface RateLimitBinding {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
}

declare global {
  var API_RATE_LIMITER: RateLimitBinding | undefined;
}

// ── Public API ──

export const RateLimiter = {
  /**
   * Check rate limit for a request. Returns null if allowed,
   * or a 429 NextResponse if rate limited.
   */
  async check(
    req: NextRequest,
    config: RateLimitConfig,
    identifier?: string,
  ): Promise<NextResponse | null> {
    const ip = getClientIP(req);
    const key = `${config.prefix}:${identifier || ip}`;

    // Try Cloudflare binding first
    if (typeof globalThis !== 'undefined' && globalThis.API_RATE_LIMITER) {
      try {
        const result = await globalThis.API_RATE_LIMITER.limit({ key });
        if (!result.success) {
          return NextResponse.json(
            { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(config.windowMs / 1000)) } },
          );
        }
        return null;
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const result = checkInMemory(key, config.max, config.windowMs);
    if (result.limited) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests. Please try again later.', retry_after: result.retryAfter },
        { status: 429, headers: { 'Retry-After': String(result.retryAfter || 60) } },
      );
    }
    return null;
  },
};

// ── Preset configs ──

export const RateLimits = {
  // Public API: 100 requests per minute per IP
  API_V1: { max: 100, windowMs: 60_000, prefix: 'api_v1' },
  // MCP: 60 requests per minute per IP
  MCP: { max: 60, windowMs: 60_000, prefix: 'mcp' },
  // API key creation: 5 per hour per user
  API_KEY_CREATE: { max: 5, windowMs: 3_600_000, prefix: 'api_key_create' },
  // Auth: 10 per minute per IP
  AUTH: { max: 10, windowMs: 60_000, prefix: 'auth' },
  // Signup: 3 per hour per IP
  SIGNUP: { max: 3, windowMs: 3_600_000, prefix: 'signup' },
} as const;

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
