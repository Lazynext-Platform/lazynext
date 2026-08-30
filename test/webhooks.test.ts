import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

/**
 * Unit tests for src/lib/webhooks.ts — dispatchWebhook().
 *
 * dispatchWebhook finds the user's active webhook endpoints subscribed to an
 * event, builds a signed JSON payload, POSTs it to each endpoint (skipping
 * SSRF-unsafe URLs), and records the response status. It is non-blocking:
 * errors are swallowed so the caller is never affected.
 *
 * We mock `@/lib/prisma` (webhookEndpoint.findMany / update) and the global
 * `fetch`. `isUrlSafe` from `@/lib/security` is left real because it is pure
 * logic and lets us genuinely verify SSRF protection.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type Endpoint = {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string;
  active: boolean;
};

type FindManyArgs = {
  where: { userId: string; active: boolean; events: { contains: string } };
};

type UpdateArgs = {
  where: { id: string };
  data: { lastFiredAt: Date; lastStatus: number };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let findManyImpl: (args: FindManyArgs) => Promise<Endpoint[]> = async () => [];
let updateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});

/** Captured fetch calls: { url, headers, body }. */
const fetchCalls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

/** Swappable fetch implementation. */
let fetchImpl: (url: string, init: RequestInit) => Promise<{ status: number }> =
  async () => ({ status: 200 });

const prismaMock = {
  webhookEndpoint: {
    findMany: (args: FindManyArgs): Promise<Endpoint[]> => {
      calls.push({ method: 'webhookEndpoint.findMany', args });
      return findManyImpl(args);
    },
    update: (args: UpdateArgs): Promise<unknown> => {
      calls.push({ method: 'webhookEndpoint.update', args });
      return updateImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

// Replace the global fetch with a swappable stub.
const originalFetch = globalThis.fetch;
function installFetchStub(): void {
  globalThis.fetch = ((url: string, init: RequestInit) => {
    fetchCalls.push({
      url,
      headers: (init?.headers as Record<string, string>) || {},
      body: (init?.body as string) || '',
    });
    return Promise.resolve(fetchImpl(url, init));
  }) as typeof fetch;
}
function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function resetMock(): void {
  calls.length = 0;
  fetchCalls.length = 0;
  findManyImpl = async () => [];
  updateImpl = async () => ({});
  fetchImpl = async () => ({ status: 200 });
}

function makeEndpoint(over: Partial<Endpoint> = {}): Endpoint {
  return {
    id: 'ep-1',
    userId: 'user-1',
    url: 'https://example.com/hook',
    secret: 'topsecret',
    events: 'creative.generated',
    active: true,
    ...over,
  };
}

/** Recompute the expected HMAC signature for a body/secret pair. */
function expectedSignature(secret: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('dispatchWebhook — dispatch & payload', () => {
  test('does nothing when the user has no subscribed endpoints', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [];
      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      assert.equal(fetchCalls.length, 0, 'no fetch should happen with no endpoints');
      // only the findMany lookup happened
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, 'webhookEndpoint.findMany');
    } finally {
      restoreFetch();
    }
  });

  test('POSTs a signed JSON payload with event/timestamp/data to each endpoint', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [makeEndpoint({ id: 'ep-a', url: 'https://a.example.com/hook', secret: 's1' })];
      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1', score: 92 });

      assert.equal(fetchCalls.length, 1);
      const fc = fetchCalls[0];
      assert.equal(fc.url, 'https://a.example.com/hook');
      assert.equal(fc.headers['Content-Type'], 'application/json');
      assert.equal(fc.headers['X-Lazynext-Event'], 'creative.generated');

      const parsed = JSON.parse(fc.body);
      assert.equal(parsed.event, 'creative.generated');
      assert.equal(parsed.data.id, 'c1');
      assert.equal(parsed.data.score, 92);
      assert.ok(typeof parsed.timestamp === 'string');
      // ISO 8601 UTC
      assert.ok(parsed.timestamp.endsWith('Z'));

      // signature matches the body
      assert.equal(fc.headers['X-Lazynext-Signature'], expectedSignature('s1', fc.body));
    } finally {
      restoreFetch();
    }
  });

  test('records lastStatus from the fetch response', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [makeEndpoint({ id: 'ep-a' })];
      fetchImpl = async () => ({ status: 201 });

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      const updateCall = calls.find((c) => c.method === 'webhookEndpoint.update');
      assert.ok(updateCall, 'should update the endpoint after firing');
      const args = updateCall!.args as UpdateArgs;
      assert.equal(args.where.id, 'ep-a');
      assert.equal(args.data.lastStatus, 201);
      assert.ok(args.data.lastFiredAt instanceof Date);
    } finally {
      restoreFetch();
    }
  });

  test('dispatches to multiple endpoints in parallel', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-a', url: 'https://a.example.com/hook', secret: 's1' }),
        makeEndpoint({ id: 'ep-b', url: 'https://b.example.com/hook', secret: 's2' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      assert.equal(fetchCalls.length, 2);
      const urls = fetchCalls.map((f) => f.url).sort();
      assert.deepEqual(urls, ['https://a.example.com/hook', 'https://b.example.com/hook']);
    } finally {
      restoreFetch();
    }
  });

  test('only selects endpoints whose events string contains the event', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      await dispatchWebhook('user-1', 'creative.scored', { id: 'c1' });

      assert.equal(calls[0].method, 'webhookEndpoint.findMany');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.userId, 'user-1');
      assert.equal(args.where.active, true);
      assert.deepEqual(args.where.events, { contains: 'creative.scored' });
    } finally {
      restoreFetch();
    }
  });
});

describe('dispatchWebhook — SSRF protection', () => {
  test('skips unsafe (localhost) URLs and does NOT fetch them', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-bad', url: 'http://127.0.0.1:3000/internal' }),
        makeEndpoint({ id: 'ep-good', url: 'https://example.com/hook' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      const fetchedUrls = fetchCalls.map((f) => f.url);
      assert.ok(!fetchedUrls.includes('http://127.0.0.1:3000/internal'), 'localhost URL must be skipped');
      assert.ok(fetchedUrls.includes('https://example.com/hook'), 'safe URL should be fetched');
    } finally {
      restoreFetch();
    }
  });

  test('skips private IP range URLs (169.254.169.254 metadata)', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-meta', url: 'http://169.254.169.254/latest/meta-data' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      assert.equal(fetchCalls.length, 0, 'metadata endpoint must not be fetched');
    } finally {
      restoreFetch();
    }
  });

  test('skips non-HTTP schemes (file://)', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-file', url: 'file:///etc/passwd' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      assert.equal(fetchCalls.length, 0);
    } finally {
      restoreFetch();
    }
  });

  test('does not update lastStatus for a skipped unsafe URL', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-bad', url: 'http://10.0.0.1/internal' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      // No fetch, and no successful-status update for the skipped endpoint.
      assert.equal(fetchCalls.length, 0);
      const updates = calls.filter((c) => c.method === 'webhookEndpoint.update');
      // The SSRF skip path returns before fetching/updating, so no update call.
      assert.equal(updates.length, 0);
    } finally {
      restoreFetch();
    }
  });
});

describe('dispatchWebhook — signature generation', () => {
  test('signature is sha256=hex(HMAC-SHA256(secret, body))', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [makeEndpoint({ id: 'ep-a', secret: 'mysecret' })];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      const sig = fetchCalls[0].headers['X-Lazynext-Signature'];
      assert.ok(sig.startsWith('sha256='));
      assert.equal(sig, expectedSignature('mysecret', fetchCalls[0].body));
    } finally {
      restoreFetch();
    }
  });

  test('different secrets produce different signatures for the same body', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [
        makeEndpoint({ id: 'ep-a', url: 'https://a.example.com/hook', secret: 'secret-a' }),
        makeEndpoint({ id: 'ep-b', url: 'https://b.example.com/hook', secret: 'secret-b' }),
      ];

      await dispatchWebhook('user-1', 'creative.generated', { id: 'c1' });

      const sigA = fetchCalls.find((f) => f.url === 'https://a.example.com/hook')!.headers['X-Lazynext-Signature'];
      const sigB = fetchCalls.find((f) => f.url === 'https://b.example.com/hook')!.headers['X-Lazynext-Signature'];
      assert.notEqual(sigA, sigB);
    } finally {
      restoreFetch();
    }
  });
});

describe('dispatchWebhook — error handling (non-blocking)', () => {
  test('a fetch rejection records lastStatus=0 and does not throw', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => [makeEndpoint({ id: 'ep-a' })];
      fetchImpl = async () => {
        throw new Error('connection refused');
      };

      // Must not reject — webhooks are non-blocking.
      await assert.doesNotReject(
        () => dispatchWebhook('user-1', 'creative.generated', { id: 'c1' }),
      );

      const errUpdate = calls
        .filter((c) => c.method === 'webhookEndpoint.update')
        .map((c) => c.args as UpdateArgs)
        .find((a) => a.data.lastStatus === 0);
      assert.ok(errUpdate, 'a failed fetch should record lastStatus=0');
    } finally {
      restoreFetch();
    }
  });

  test('a findMany rejection is swallowed (never blocks the caller)', async () => {
    resetMock();
    installFetchStub();
    try {
      const { dispatchWebhook } = await import('@/lib/webhooks');

      findManyImpl = async () => {
        throw new Error('DB down');
      };

      await assert.doesNotReject(
        () => dispatchWebhook('user-1', 'creative.generated', { id: 'c1' }),
      );
      assert.equal(fetchCalls.length, 0);
    } finally {
      restoreFetch();
    }
  });
});
