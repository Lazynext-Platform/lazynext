/**
 * Fetch with automatic retry on transient errors (500, 502, 503).
 *
 * Cloudflare D1 can return 500 on the first request after a cold start
 * while the database connection is being established. A single retry
 * after a short delay resolves the issue in the vast majority of cases.
 *
 * Usage:
 *   const data = await fetchWithRetry('/api/me').then(r => r.json());
 */

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const DEFAULT_DELAY_MS = 500;
const DEFAULT_MAX_RETRIES = 2;

export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  options?: { maxRetries?: number; delayMs?: number },
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || !RETRYABLE_STATUS.has(response.status)) {
        return response;
      }
      // Transient error — retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      return response;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
