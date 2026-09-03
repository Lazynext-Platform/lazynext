/**
 * Cold-start resilience helper for Cloudflare Workers.
 *
 * On a Worker cold start, the first Prisma/D1 query can fail with a 500
 * while the WASM engine initializes. This helper retries once after a
 * short delay, and if the query still fails, returns a fallback value
 * so server components render an empty/loading state instead of crashing
 * to the global error boundary.
 */

const COLD_START_DELAY_MS = 300;

export async function safePrisma<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch {
    // Retry once after a brief delay (cold-start resilience)
    try {
      await new Promise((r) => setTimeout(r, COLD_START_DELAY_MS));
      return await fn();
    } catch {
      return fallback;
    }
  }
}
