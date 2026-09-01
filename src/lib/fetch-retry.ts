/**
 * Fetch with automatic retry on transient errors (500, 502, 503).
 *
 * Cloudflare D1 can return 500 on the first request after a cold start
 * while the database connection is being established. Retries with
 * exponential backoff resolve the issue in the vast majority of cases.
 *
 * Usage:
 *   const data = await fetchWithRetry('/api/me').then(r => r.json());
 */

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const DEFAULT_DELAY_MS = 400;
const DEFAULT_MAX_RETRIES = 3;

export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  options?: { maxRetries?: number; delayMs?: number },
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options?.delayMs ?? DEFAULT_DELAY_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || !RETRYABLE_STATUS.has(response.status)) {
        return response;
      }
      // Transient error — retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(1.5, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(1.5, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

/**
 * Fire-and-forget warmup request to pre-establish D1 connections.
 * Call this on dashboard/page load to reduce cold-start 500s.
 */
let warmupPromise: Promise<void> | null = null;

export function warmupApi(): Promise<void> {
  if (warmupPromise) return warmupPromise;
  warmupPromise = (async () => {
    try {
      await fetch('/api/health', { cache: 'no-store' });
    } catch {
      // Ignore — this is best-effort
    }
  })();
  // Clear the promise after 30s so future calls can warmup again
  setTimeout(() => { warmupPromise = null; }, 30000);
  return warmupPromise;
}
