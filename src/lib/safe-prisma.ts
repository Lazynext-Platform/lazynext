/**
 * Cold-start resilience helper for Cloudflare Workers.
 *
 * On a Worker cold start, the first Prisma/D1 query can fail with a 500
 * while the WASM engine initializes. This helper retries once after a
 * short delay, and if the query still fails, returns a fallback value
 * so server components render an empty/loading state instead of crashing
 * to the global error boundary.
 */

const COLD_START_DELAYS_MS = [200, 500, 1000];

export async function safePrisma<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  for (let attempt = 0; attempt <= COLD_START_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch {
      if (attempt < COLD_START_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, COLD_START_DELAYS_MS[attempt]));
        continue;
      }
      return fallback;
    }
  }
  return fallback;
}
