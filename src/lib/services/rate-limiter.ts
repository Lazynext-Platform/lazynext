// ── Rate Limiter (Phase 12: API Platform) ──
//
// In-memory sliding-window rate limiter for org-scoped API keys. Each key has
// two windows: per-minute and per-day. On Cloudflare Workers each isolate has
// its own memory, so this is a best-effort limiter (the Durable Object or
// rate-limit binding would provide true distributed protection).

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

interface WindowState {
  /** Timestamps of requests within the per-minute window. */
  minWindow: number[];
  /** Timestamps of requests within the per-day window. */
  dayWindow: number[];
}

const windows = new Map<string, WindowState>();

function pruneWindow(timestamps: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingMin: number;
  remainingDay: number;
  resetAt: number;
}

export interface RateLimitStatus {
  countMin: number;
  countDay: number;
  resetAt: number;
}

export interface RateLimitStats {
  trackedKeys: number;
  totalRequests: number;
}

export const RateLimiter = {
  /**
   * Check whether a request is within rate limits WITHOUT recording it.
   * Use `record()` to actually count the request after a successful check.
   */
  check(
    apiKeyId: string,
    limits: { perMin: number; perDay: number },
  ): RateLimitCheckResult {
    const now = Date.now();
    let state = windows.get(apiKeyId);
    if (!state) {
      state = { minWindow: [], dayWindow: [] };
      windows.set(apiKeyId, state);
    }

    const minCount = pruneWindow(state.minWindow, now, MINUTE_MS).length;
    const dayCount = pruneWindow(state.dayWindow, now, DAY_MS).length;

    const remainingMin = Math.max(0, limits.perMin - minCount);
    const remainingDay = Math.max(0, limits.perDay - dayCount);
    const allowed = minCount < limits.perMin && dayCount < limits.perDay;

    return {
      allowed,
      remainingMin,
      remainingDay,
      resetAt: now + MINUTE_MS,
    };
  },

  /**
   * Record a request against both windows for a key.
   */
  record(apiKeyId: string): void {
    const now = Date.now();
    let state = windows.get(apiKeyId);
    if (!state) {
      state = { minWindow: [], dayWindow: [] };
      windows.set(apiKeyId, state);
    }
    state.minWindow = pruneWindow(state.minWindow, now, MINUTE_MS);
    state.dayWindow = pruneWindow(state.dayWindow, now, DAY_MS);
    state.minWindow.push(now);
    state.dayWindow.push(now);
  },

  /**
   * Get the current status (counts) for a key without recording a request.
   */
  getStatus(apiKeyId: string): RateLimitStatus {
    const now = Date.now();
    const state = windows.get(apiKeyId);
    if (!state) {
      return { countMin: 0, countDay: 0, resetAt: now + MINUTE_MS };
    }
    return {
      countMin: pruneWindow(state.minWindow, now, MINUTE_MS).length,
      countDay: pruneWindow(state.dayWindow, now, DAY_MS).length,
      resetAt: now + MINUTE_MS,
    };
  },

  /**
   * Reset all counters for a key.
   */
  reset(apiKeyId: string): void {
    windows.delete(apiKeyId);
  },

  /**
   * Global stats across all tracked keys.
   */
  getStats(): RateLimitStats {
    let totalRequests = 0;
    for (const state of windows.values()) {
      totalRequests += state.dayWindow.length;
    }
    return {
      trackedKeys: windows.size,
      totalRequests,
    };
  },
};
