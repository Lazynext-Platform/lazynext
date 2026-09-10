/**
 * Simple in-memory cache with TTL support.
 *
 * Used for cache-through patterns in services and API routes to avoid
 * redundant database queries or expensive computations. Entries expire
 * automatically based on their TTL and are lazily evicted on read.
 */

const DEFAULT_TTL_MS = 60_000; // 60 seconds

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms; Infinity = never expires
}

const store = new Map<string, CacheEntry<unknown>>();
let hits = 0;
let misses = 0;

/**
 * Get a value from the cache. Returns null on miss or expiry.
 * Expired entries are evicted on read.
 */
export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) {
    misses += 1;
    return null;
  }
  if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
    store.delete(key);
    misses += 1;
    return null;
  }
  hits += 1;
  return entry.value as T;
}

/**
 * Set a value in the cache with an optional TTL (default 60s).
 * Pass ttlMs = Infinity for a non-expiring entry.
 */
export function set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const expiresAt = ttlMs === Infinity ? Infinity : Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
}

/**
 * Delete a single key from the cache.
 */
export function deleteKey(key: string): void {
  store.delete(key);
}

/**
 * Clear all cached entries (does not reset hit/miss counters).
 */
export function clear(): void {
  store.clear();
}

/**
 * Cache-through: return the cached value if present and fresh,
 * otherwise call fn, cache the result, and return it.
 */
export async function wrap<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== null) return cached;
  const value = await fn();
  set(key, value, ttlMs);
  return value;
}

/**
 * Return cache statistics.
 */
export function getStats(): { size: number; hits: number; misses: number; hitRate: number } {
  const total = hits + misses;
  return {
    size: store.size,
    hits,
    misses,
    hitRate: total > 0 ? Math.round((hits / total) * 1000) / 1000 : 0,
  };
}

/**
 * Reset hit/miss counters (useful for tests). Does not clear entries.
 */
export function resetStats(): void {
  hits = 0;
  misses = 0;
}

export const cache = {
  get,
  set,
  delete: deleteKey,
  clear,
  wrap,
  getStats,
  resetStats,
};
