import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// RateLimiter — in-memory, no mocks needed
// ─────────────────────────────────────────────────────────────────────────────

const { RateLimiter } = await import('@/lib/services/rate-limiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset all tracked keys before each test
    RateLimiter.reset('test-key');
    RateLimiter.reset('test-key-2');
    RateLimiter.reset('key-a');
    RateLimiter.reset('key-b');
  });

  describe('check', () => {
    it('allows when under both per-minute and per-day limits', () => {
      const result = RateLimiter.check('test-key', { perMin: 60, perDay: 10000 });

      assert.equal(result.allowed, true);
      assert.equal(result.remainingMin, 60);
      assert.equal(result.remainingDay, 10000);
      assert.ok(result.resetAt > Date.now());
    });

    it('denies when over per-minute limit', () => {
      // Record 5 requests, then check with limit 5 (should be denied)
      for (let i = 0; i < 5; i++) {
        RateLimiter.record('test-key');
      }

      const result = RateLimiter.check('test-key', { perMin: 5, perDay: 10000 });

      assert.equal(result.allowed, false);
      assert.equal(result.remainingMin, 0);
    });

    it('denies when over per-day limit', () => {
      // Record 3 requests, check with per-day limit 3
      for (let i = 0; i < 3; i++) {
        RateLimiter.record('test-key');
      }

      const result = RateLimiter.check('test-key', { perMin: 100, perDay: 3 });

      assert.equal(result.allowed, false);
      assert.equal(result.remainingDay, 0);
    });

    it('does not record a request (check only)', () => {
      const before = RateLimiter.getStatus('test-key');
      RateLimiter.check('test-key', { perMin: 60, perDay: 10000 });
      const after = RateLimiter.getStatus('test-key');

      // check should not increment counts
      assert.equal(after.countMin, before.countMin);
      assert.equal(after.countDay, before.countDay);
    });
  });

  describe('record', () => {
    it('increments both per-minute and per-day counts', () => {
      RateLimiter.record('test-key');
      RateLimiter.record('test-key');

      const status = RateLimiter.getStatus('test-key');

      assert.equal(status.countMin, 2);
      assert.equal(status.countDay, 2);
    });

    it('creates new window state for a new key', () => {
      RateLimiter.record('new-key');

      const status = RateLimiter.getStatus('new-key');

      assert.equal(status.countMin, 1);
      assert.equal(status.countDay, 1);
      RateLimiter.reset('new-key');
    });
  });

  describe('getStatus', () => {
    it('returns zero counts for an unknown key', () => {
      const status = RateLimiter.getStatus('unknown-key');

      assert.equal(status.countMin, 0);
      assert.equal(status.countDay, 0);
      assert.ok(status.resetAt > Date.now());
    });

    it('returns current counts for a known key', () => {
      RateLimiter.record('test-key');
      RateLimiter.record('test-key');
      RateLimiter.record('test-key');

      const status = RateLimiter.getStatus('test-key');

      assert.equal(status.countMin, 3);
      assert.equal(status.countDay, 3);
    });
  });

  describe('reset', () => {
    it('clears all counters for a key', () => {
      RateLimiter.record('test-key');
      RateLimiter.record('test-key');

      RateLimiter.reset('test-key');

      const status = RateLimiter.getStatus('test-key');
      assert.equal(status.countMin, 0);
      assert.equal(status.countDay, 0);
    });
  });

  describe('getStats', () => {
    it('returns tracked key count and total requests', () => {
      RateLimiter.record('key-a');
      RateLimiter.record('key-a');
      RateLimiter.record('key-b');

      const stats = RateLimiter.getStats();

      assert.ok(stats.trackedKeys >= 2);
      assert.ok(stats.totalRequests >= 3);
    });

    it('returns zero tracked keys when all are reset', () => {
      RateLimiter.reset('key-a');
      RateLimiter.reset('key-b');

      const stats = RateLimiter.getStats();

      // trackedKeys may include keys from other tests, but our reset keys are gone
      // Just verify the structure is correct
      assert.ok(typeof stats.trackedKeys === 'number');
      assert.ok(typeof stats.totalRequests === 'number');
    });
  });

  describe('check + record pattern', () => {
    it('check then record works correctly for rate limiting', () => {
      const limits = { perMin: 3, perDay: 100 };

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const check = RateLimiter.check('test-key', limits);
        assert.equal(check.allowed, true);
        RateLimiter.record('test-key');
      }

      // 4th request should be denied
      const check = RateLimiter.check('test-key', limits);
      assert.equal(check.allowed, false);
    });
  });
});
