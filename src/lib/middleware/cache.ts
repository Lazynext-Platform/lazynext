/**
 * API response caching middleware (Phase 30 perf).
 *
 * Wraps a GET-only API route handler with a simple in-memory TTL cache.
 * Non-GET requests bypass the cache. Cached hits return an `X-Cache: HIT`
 * header; freshly computed responses return `X-Cache: MISS`.
 */

import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Wrap a Next.js API route handler with an in-memory cache for GET requests.
 *
 * @param handler  The original route handler.
 * @param ttlMs    Time-to-live in milliseconds (default 60s).
 * @returns A new handler that serves cached GET responses and passes through
 *          everything else unchanged.
 */
export function withCache(handler: RouteHandler, ttlMs: number = 60_000): RouteHandler {
  const cache = new Map<string, CacheEntry>();

  return async (req: NextRequest): Promise<NextResponse> => {
    // Only cache safe (GET) requests — never cache mutations.
    if (req.method !== 'GET') {
      return handler(req);
    }

    const key = req.url;
    const cached = cache.get(key);

    // Serve from cache if still fresh.
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } });
    }

    // Compute a fresh response.
    const response = await handler(req);

    // Only cache successful responses so errors aren't sticky.
    if (response.ok) {
      try {
        const data = await response.json();
        cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
      } catch {
        // Response body isn't JSON — return the original response uncached.
        return response;
      }
    }

    return response;
  };
}
