import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — minimal NextRequest mock (next/server can't be imported in test env)
// ─────────────────────────────────────────────────────────────────────────────

class MockNextRequest {
  headers: Map<string, string>;
  url: string;
  method: string;

  constructor(url: string, opts: { headers?: Record<string, string> } = {}) {
    this.url = url;
    this.method = 'GET';
    this.headers = new Map(Object.entries(opts.headers || {}));
  }

  getHeader(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

function makeReq(ip = '1.2.3.4'): unknown {
  return new MockNextRequest('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RateLimits presets
// ─────────────────────────────────────────────────────────────────────────────

describe('RateLimits presets', () => {
  it('API_V1 has correct config', () => {
    assert.equal(RateLimits.API_V1.max, 100);
    assert.equal(RateLimits.API_V1.windowMs, 60_000);
    assert.equal(RateLimits.API_V1.prefix, 'api_v1');
  });

  it('MCP has correct config', () => {
    assert.equal(RateLimits.MCP.max, 60);
    assert.equal(RateLimits.MCP.windowMs, 60_000);
    assert.equal(RateLimits.MCP.prefix, 'mcp');
  });

  it('AUTH has correct config', () => {
    assert.equal(RateLimits.AUTH.max, 10);
    assert.equal(RateLimits.AUTH.windowMs, 60_000);
    assert.equal(RateLimits.AUTH.prefix, 'auth');
  });

  it('SIGNUP has correct config', () => {
    assert.equal(RateLimits.SIGNUP.max, 3);
    assert.equal(RateLimits.SIGNUP.windowMs, 3_600_000);
    assert.equal(RateLimits.SIGNUP.prefix, 'signup');
  });

  it('API_KEY_CREATE has correct config', () => {
    assert.equal(RateLimits.API_KEY_CREATE.max, 5);
    assert.equal(RateLimits.API_KEY_CREATE.windowMs, 3_600_000);
    assert.equal(RateLimits.API_KEY_CREATE.prefix, 'api_key_create');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RateLimiter.check (in-memory fallback, no Cloudflare binding)
// ─────────────────────────────────────────────────────────────────────────────

describe('RateLimiter.check', () => {
  it('allows first request', async () => {
    const req = makeReq('10.0.0.1');
    const result = await RateLimiter.check(req, { max: 5, windowMs: 60_000, prefix: 'test_allow' });
    assert.equal(result, null);
  });

  it('blocks after exceeding max requests', async () => {
    const req = makeReq('10.0.0.2');
    const config = { max: 3, windowMs: 60_000, prefix: 'test_block' };
    // First 3 should pass
    for (let i = 0; i < 3; i++) {
      const r = await RateLimiter.check(req, config);
      assert.equal(r, null, `request ${i + 1} should be allowed`);
    }
    // 4th should be blocked
    const blocked = await RateLimiter.check(req, config);
    assert.ok(blocked, '4th request should be rate limited');
    assert.equal(blocked!.status, 429);
    const body = await blocked!.json();
    assert.equal(body.error, 'rate_limited');
  });

  it('uses custom identifier when provided', async () => {
    const req = makeReq('10.0.0.3');
    const config = { max: 2, windowMs: 60_000, prefix: 'test_id' };
    // Use identifier "user-A" — 2 requests
    for (let i = 0; i < 2; i++) {
      const r = await RateLimiter.check(req, config, 'user-A');
      assert.equal(r, null);
    }
    // user-A 3rd request should be blocked
    const blocked = await RateLimiter.check(req, config, 'user-A');
    assert.ok(blocked);

    // user-B should still be allowed (different bucket)
    const otherUser = await RateLimiter.check(req, config, 'user-B');
    assert.equal(otherUser, null);
  });

  it('includes Retry-After header when rate limited', async () => {
    const req = makeReq('10.0.0.4');
    const config = { max: 1, windowMs: 30_000, prefix: 'test_retry' };
    await RateLimiter.check(req, config); // first request passes
    const blocked = await RateLimiter.check(req, config);
    assert.ok(blocked);
    assert.ok(blocked!.headers.get('Retry-After'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RateLimiter.checkDistributed (in-memory fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe('RateLimiter.checkDistributed', () => {
  it('returns limited=false for first request', async () => {
    const req = makeReq('10.0.0.5');
    const result = await RateLimiter.checkDistributed(req, { max: 5, windowMs: 60_000, prefix: 'test_dist_1' });
    assert.equal(result.limited, false);
  });

  it('returns limited=true after exceeding max', async () => {
    const req = makeReq('10.0.0.6');
    const config = { max: 2, windowMs: 60_000, prefix: 'test_dist_2' };
    for (let i = 0; i < 2; i++) {
      const r = await RateLimiter.checkDistributed(req, config);
      assert.equal(r.limited, false);
    }
    const result = await RateLimiter.checkDistributed(req, config);
    assert.equal(result.limited, true);
    assert.ok(result.retryAfter && result.retryAfter > 0);
  });

  it('uses identifier for separate buckets', async () => {
    const req = makeReq('10.0.0.7');
    const config = { max: 1, windowMs: 60_000, prefix: 'test_dist_3' };
    // user-A uses up their limit
    await RateLimiter.checkDistributed(req, config, 'user-A');
    const aBlocked = await RateLimiter.checkDistributed(req, config, 'user-A');
    assert.equal(aBlocked.limited, true);

    // user-B should still be allowed
    const bResult = await RateLimiter.checkDistributed(req, config, 'user-B');
    assert.equal(bResult.limited, false);
  });
});
