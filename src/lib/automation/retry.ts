// ── Retry / Backoff Utility ──
//
// Production-grade retry helpers for automation dispatch and webhook
// delivery. Provides exponential backoff with optional jitter, retryable
// error classification, and a summary formatter for logging.

export interface RetryConfig {
  /** Maximum number of attempts (including the first). */
  maxAttempts: number;
  /** Delay before the first retry, in milliseconds. */
  initialDelayMs: number;
  /** Upper bound for any single retry delay, in milliseconds. */
  maxDelayMs: number;
  /** Multiplier applied between successive delays (exponential backoff). */
  backoffMultiplier: number;
  /** When true, add up to ±25% random jitter to each delay. */
  jitter: boolean;
}

/** Default retry config for automation dispatch. */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/** Retry config tuned for outbound webhook delivery. */
export const WEBHOOK_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate the delay (ms) before the *next* attempt, given the
 * 0-based index of the attempt that just failed.
 *
 * delay = min(initialDelay * multiplier^attempt, maxDelay)
 * With jitter, the value is shifted by up to ±25%.
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const base = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs,
  );

  if (!config.jitter) return base;

  // ±25% jitter
  const jitterRange = base * 0.25;
  const offset = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(0, Math.round(base + offset));
}

/** Promise-based delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  errors: Error[];
}

/**
 * Determine whether an error is worth retrying.
 *
 * Retryable: network errors, timeouts, and HTTP 5xx responses.
 * Not retryable: HTTP 4xx client errors (except 408/429).
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Fetch-style errors may carry a numeric `status` / `statusCode`.
  const anyErr = error as { status?: number; statusCode?: number; code?: string; name?: string; message?: string };

  const status = anyErr.status ?? anyErr.statusCode;
  if (typeof status === 'number') {
    if (status >= 500 && status < 600) return true;
    if (status === 408 || status === 429) return true;
    if (status >= 400 && status < 500) return false;
  }

  // Node fetch network errors surface as TypeError: fetch failed.
  const name = anyErr.name ?? '';
  const message = anyErr.message ?? '';
  if (name === 'TypeError' && /fetch|network|econnrefused|econnreset|etimedout/i.test(message)) {
    return true;
  }

  // Common Node error codes for network/timeout failures.
  const code = anyErr.code ?? '';
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'ABORT_ERR'
  ) {
    return true;
  }

  // Generic timeout / abort errors.
  if (name === 'AbortError' || /timeout/i.test(message)) return true;

  // Unknown errors default to retryable so transient issues recover.
  return true;
}

/**
 * Execute a synchronous function with retry logic.
 * Returns { result, attempts, errors }.
 */
export function withRetry<T>(fn: () => T, config: RetryConfig = DEFAULT_RETRY_CONFIG): RetryResult<T> {
  const errors: Error[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const result = fn();
      return { result, attempts: attempt + 1, errors };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      errors.push(lastError);
      if (!isRetryableError(e) || attempt === config.maxAttempts - 1) {
        break;
      }
    }
  }

  throw lastError ?? new Error('withRetry: exhausted attempts');
}

/**
 * Execute an async function with retry logic.
 * On failure, waits the calculated delay (with backoff) and retries.
 * Returns { result, attempts, errors } on success.
 * Throws the last error after maxAttempts.
 */
export async function withRetryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<RetryResult<T>> {
  const errors: Error[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1, errors };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      errors.push(lastError);

      if (!isRetryableError(e) || attempt === config.maxAttempts - 1) {
        break;
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('withRetryAsync: exhausted attempts');
}

/**
 * Format a human-readable summary string for logging.
 */
export function formatRetrySummary(attempts: number, errors: Error[]): string {
  if (errors.length === 0) {
    return `succeeded after ${attempts} attempt(s)`;
  }
  const last = errors[errors.length - 1];
  return `failed after ${attempts} attempt(s), ${errors.length} error(s); last: ${last.message}`;
}
