import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// retry.ts — pure utility, no prisma mocks needed for calculateDelay/isRetryableError
// ─────────────────────────────────────────────────────────────────────────────

const {
  calculateDelay,
  sleep,
  withRetry,
  withRetryAsync,
  isRetryableError,
  formatRetrySummary,
  DEFAULT_RETRY_CONFIG,
  WEBHOOK_RETRY_CONFIG,
} = await import('@/lib/automation/retry');

describe('retry utility', () => {
  describe('calculateDelay', () => {
    it('returns exponential backoff without jitter', () => {
      const config = { maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2, jitter: false };
      assert.equal(calculateDelay(0, config), 1000);
      assert.equal(calculateDelay(1, config), 2000);
      assert.equal(calculateDelay(2, config), 4000);
      assert.equal(calculateDelay(3, config), 8000);
    });

    it('caps delay at maxDelayMs', () => {
      const config = { maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2, jitter: false };
      assert.equal(calculateDelay(0, config), 1000);
      assert.equal(calculateDelay(3, config), 5000);
      assert.equal(calculateDelay(10, config), 5000);
    });

    it('applies jitter within ±25% of base', () => {
      const config = { maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2, jitter: true };
      const base = 1000;
      for (let i = 0; i < 50; i++) {
        const delay = calculateDelay(0, config);
        assert.ok(delay >= Math.round(base * 0.75), `delay ${delay} below jitter floor`);
        assert.ok(delay <= Math.round(base * 1.25), `delay ${delay} above jitter ceiling`);
      }
    });

    it('uses multiplier correctly for non-2 values', () => {
      const config = { maxAttempts: 5, initialDelayMs: 500, maxDelayMs: 100000, backoffMultiplier: 3, jitter: false };
      assert.equal(calculateDelay(0, config), 500);
      assert.equal(calculateDelay(1, config), 1500);
      assert.equal(calculateDelay(2, config), 4500);
    });
  });

  describe('sleep', () => {
    it('resolves after the given delay', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      assert.ok(elapsed >= 40, `elapsed ${elapsed}ms too short`);
    });
  });

  describe('withRetry (sync)', () => {
    it('succeeds on first attempt', () => {
      const fn = mock.fn(() => 42);
      const result = withRetry(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false });
      assert.equal(result.result, 42);
      assert.equal(result.attempts, 1);
      assert.equal(result.errors.length, 0);
      assert.equal(fn.mock.callCount(), 1);
    });

    it('succeeds on retry after transient failure', () => {
      let calls = 0;
      const fn = () => {
        calls++;
        if (calls < 2) throw new Error('transient');
        return 'ok';
      };
      const result = withRetry(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false });
      assert.equal(result.result, 'ok');
      assert.equal(result.attempts, 2);
      assert.equal(result.errors.length, 1);
    });

    it('throws after maxAttempts', () => {
      const fn = () => { throw new Error('always fails'); };
      assert.throws(() => withRetry(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false }), /always fails/);
    });
  });

  describe('withRetryAsync', () => {
    it('succeeds on first attempt', async () => {
      const fn = async () => 'success';
      const result = await withRetryAsync(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false });
      assert.equal(result.result, 'success');
      assert.equal(result.attempts, 1);
    });

    it('retries on retryable error and succeeds', async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        if (calls < 3) {
          const err = new Error('server error') as Error & { status: number };
          err.status = 500;
          throw err;
        }
        return 'done';
      };
      const result = await withRetryAsync(fn, { maxAttempts: 5, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false });
      assert.equal(result.result, 'done');
      assert.equal(result.attempts, 3);
      assert.equal(result.errors.length, 2);
    });

    it('does not retry on 4xx client error', async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        const err = new Error('bad request') as Error & { status: number };
        err.status = 400;
        throw err;
      };
      await assert.rejects(async () => withRetryAsync(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false }));
      assert.equal(calls, 1);
    });

    it('throws last error after maxAttempts', async () => {
      const fn = async () => {
        const err = new Error('timeout') as Error & { code: string };
        err.code = 'ETIMEDOUT';
        throw err;
      };
      await assert.rejects(
        async () => withRetryAsync(fn, { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, jitter: false }),
        /timeout/,
      );
    });
  });

  describe('isRetryableError', () => {
    it('returns true for 5xx errors', () => {
      const err = new Error('server') as Error & { status: number };
      err.status = 503;
      assert.equal(isRetryableError(err), true);
    });

    it('returns false for 4xx client errors (except 408/429)', () => {
      const err = new Error('bad') as Error & { status: number };
      err.status = 404;
      assert.equal(isRetryableError(err), false);
    });

    it('returns true for 429 rate limit', () => {
      const err = new Error('rate') as Error & { status: number };
      err.status = 429;
      assert.equal(isRetryableError(err), true);
    });

    it('returns true for network TypeError', () => {
      const err = new TypeError('fetch failed');
      assert.equal(isRetryableError(err), true);
    });

    it('returns true for ETIMEDOUT code', () => {
      const err = new Error('timeout') as Error & { code: string };
      err.code = 'ETIMEDOUT';
      assert.equal(isRetryableError(err), true);
    });
  });

  describe('formatRetrySummary', () => {
    it('formats success with no errors', () => {
      const summary = formatRetrySummary(1, []);
      assert.match(summary, /succeeded after 1 attempt/);
    });

    it('formats failure with errors', () => {
      const summary = formatRetrySummary(3, [new Error('a'), new Error('b')]);
      assert.match(summary, /failed after 3 attempt/);
      assert.match(summary, /last: b/);
    });
  });

  describe('default configs', () => {
    it('DEFAULT_RETRY_CONFIG has expected values', () => {
      assert.equal(DEFAULT_RETRY_CONFIG.maxAttempts, 5);
      assert.equal(DEFAULT_RETRY_CONFIG.initialDelayMs, 1000);
      assert.equal(DEFAULT_RETRY_CONFIG.maxDelayMs, 30000);
      assert.equal(DEFAULT_RETRY_CONFIG.backoffMultiplier, 2);
      assert.equal(DEFAULT_RETRY_CONFIG.jitter, true);
    });

    it('WEBHOOK_RETRY_CONFIG has expected values', () => {
      assert.equal(WEBHOOK_RETRY_CONFIG.maxAttempts, 3);
      assert.equal(WEBHOOK_RETRY_CONFIG.initialDelayMs, 500);
      assert.equal(WEBHOOK_RETRY_CONFIG.maxDelayMs, 10000);
    });
  });
});
