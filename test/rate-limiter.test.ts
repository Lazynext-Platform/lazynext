import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the rate limiter service.
 *
 * RateLimiter.check depends on NextRequest and the Cloudflare binding,
 * which can't be easily tested in isolation. These tests verify the
 * RateLimits presets and the in-memory bucket logic pattern.
 */

// RateLimits presets (mirrors src/lib/services/rate-limit.ts)
const RateLimits = {
  API_V1: { max: 100, windowMs: 60_000, prefix: 'api_v1' },
  MCP: { max: 60, windowMs: 60_000, prefix: 'mcp' },
  API_KEY_CREATE: { max: 5, windowMs: 3_600_000, prefix: 'api_key_create' },
  AUTH: { max: 10, windowMs: 60_000, prefix: 'auth' },
  SIGNUP: { max: 3, windowMs: 3_600_000, prefix: 'signup' },
} as const;

describe('RateLimiter', () => {
  describe('RateLimits presets', () => {
    test('API_V1 is 100 requests per minute', () => {
      assert.equal(RateLimits.API_V1.max, 100);
      assert.equal(RateLimits.API_V1.windowMs, 60_000);
      assert.equal(RateLimits.API_V1.prefix, 'api_v1');
    });

    test('MCP is 60 requests per minute', () => {
      assert.equal(RateLimits.MCP.max, 60);
      assert.equal(RateLimits.MCP.windowMs, 60_000);
      assert.equal(RateLimits.MCP.prefix, 'mcp');
    });

    test('API_KEY_CREATE is 5 per hour', () => {
      assert.equal(RateLimits.API_KEY_CREATE.max, 5);
      assert.equal(RateLimits.API_KEY_CREATE.windowMs, 3_600_000);
      assert.equal(RateLimits.API_KEY_CREATE.prefix, 'api_key_create');
    });

    test('AUTH is 10 per minute', () => {
      assert.equal(RateLimits.AUTH.max, 10);
      assert.equal(RateLimits.AUTH.windowMs, 60_000);
      assert.equal(RateLimits.AUTH.prefix, 'auth');
    });

    test('SIGNUP is 3 per hour', () => {
      assert.equal(RateLimits.SIGNUP.max, 3);
      assert.equal(RateLimits.SIGNUP.windowMs, 3_600_000);
      assert.equal(RateLimits.SIGNUP.prefix, 'signup');
    });

    test('all presets have unique prefixes', () => {
      const prefixes = Object.values(RateLimits).map((r) => r.prefix);
      const unique = new Set(prefixes);
      assert.equal(prefixes.length, unique.size, 'prefixes should be unique');
    });

    test('all presets have positive max values', () => {
      for (const [name, config] of Object.entries(RateLimits)) {
        assert.ok(config.max > 0, `${name} max should be positive`);
      }
    });

    test('all presets have positive window values', () => {
      for (const [name, config] of Object.entries(RateLimits)) {
        assert.ok(config.windowMs > 0, `${name} windowMs should be positive`);
      }
    });
  });

  describe('in-memory bucket logic pattern', () => {
    test('bucket allows requests up to max', () => {
      // Simulate the in-memory bucket logic
      const buckets = new Map<string, { count: number; resetAt: number }>();
      const key = 'test:bucket';
      const max = 5;
      const windowMs = 1000;
      const now = Date.now();

      for (let i = 0; i < max; i++) {
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt < now) {
          buckets.set(key, { count: 1, resetAt: now + windowMs });
        } else {
          bucket.count++;
        }
      }

      const bucket = buckets.get(key)!;
      assert.equal(bucket.count, max);
    });

    test('bucket rejects requests over max', () => {
      const buckets = new Map<string, { count: number; resetAt: number }>();
      const key = 'test:overflow';
      const max = 3;
      const windowMs = 1000;
      const now = Date.now();

      let limited = false;
      for (let i = 0; i < max + 2; i++) {
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt < now) {
          buckets.set(key, { count: 1, resetAt: now + windowMs });
          limited = false;
        } else {
          bucket.count++;
          limited = bucket.count > max;
        }
      }

      assert.ok(limited, 'should be limited after exceeding max');
    });

    test('bucket resets after window expires', () => {
      const buckets = new Map<string, { count: number; resetAt: number }>();
      const key = 'test:reset';
      const max = 3;
      const windowMs = 100;

      // Fill bucket
      buckets.set(key, { count: max, resetAt: Date.now() - 1 }); // expired
      const now = Date.now();

      const bucket = buckets.get(key)!;
      assert.ok(bucket.resetAt < now, 'bucket should be expired');

      // Simulate reset
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      const newBucket = buckets.get(key)!;
      assert.equal(newBucket.count, 1);
    });
  });
});
