import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ApiKeyCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    description: string;
    keyPrefix: string;
    keyHash: string;
    scopes: string;
    rateLimitPerMin: number;
    rateLimitPerDay: number;
    expiresAt: Date | null;
    createdBy: string;
  };
};

type ApiKeyFindManyArgs = {
  where: { organizationId: string };
  orderBy?: Record<string, unknown>;
};

type ApiKeyFindUniqueArgs = {
  where: { id?: string; keyHash?: string };
};

type ApiKeyUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type ApiKeyDeleteArgs = {
  where: { id: string };
};

type ApiUsageLogFindManyArgs = {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let apiKeyCreateImpl: (args: ApiKeyCreateArgs) => Promise<unknown> =
  async () => ({});
let apiKeyFindManyImpl: (args: ApiKeyFindManyArgs) => Promise<unknown[]> =
  async () => [];
let apiKeyFindUniqueImpl: (args: ApiKeyFindUniqueArgs) => Promise<unknown> =
  async () => null;
let apiKeyUpdateImpl: (args: ApiKeyUpdateArgs) => Promise<unknown> =
  async () => ({});
let apiKeyDeleteImpl: (args: ApiKeyDeleteArgs) => Promise<unknown> =
  async () => ({});

let apiUsageLogFindManyImpl: (args: ApiUsageLogFindManyArgs) => Promise<unknown[]> =
  async () => [];

const prismaMock = {
  platformApiKey: {
    create: (args: ApiKeyCreateArgs): Promise<unknown> => {
      calls.push({ method: 'platformApiKey.create', args });
      return apiKeyCreateImpl(args);
    },
    findMany: (args: ApiKeyFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'platformApiKey.findMany', args });
      return apiKeyFindManyImpl(args);
    },
    findUnique: (args: ApiKeyFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'platformApiKey.findUnique', args });
      return apiKeyFindUniqueImpl(args);
    },
    update: (args: ApiKeyUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'platformApiKey.update', args });
      return apiKeyUpdateImpl(args);
    },
    delete: (args: ApiKeyDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'platformApiKey.delete', args });
      return apiKeyDeleteImpl(args);
    },
  },
  apiUsageLog: {
    findMany: (args: ApiUsageLogFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'apiUsageLog.findMany', args });
      return apiUsageLogFindManyImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  apiKeyCreateImpl = async () => ({});
  apiKeyFindManyImpl = async () => [];
  apiKeyFindUniqueImpl = async () => null;
  apiKeyUpdateImpl = async () => ({});
  apiKeyDeleteImpl = async () => ({});
  apiUsageLogFindManyImpl = async () => [];
}

const { ApiKeyService, generatePlatformKey, hashPlatformKey } = await import('@/lib/services/api-key-service');

// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyService
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiKeyService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('generates a key with lnxt_ prefix, hashes it, and returns plaintext', async () => {
      apiKeyCreateImpl = async (args: ApiKeyCreateArgs) => ({
        id: 'key-1',
        ...args.data,
      });

      const result = await ApiKeyService.create('org-1', {
        name: 'My Key',
        createdBy: 'user-1',
      });

      assert.ok(result.apiKey);
      assert.equal(result.apiKey.id, 'key-1');
      assert.ok(result.plaintextKey.startsWith('lnxt_'));
      assert.equal(result.plaintextKey.length, 37); // 'lnxt_' (5) + 32 hex chars
      assert.equal(calls[0].method, 'platformApiKey.create');
      const args = calls[0].args as ApiKeyCreateArgs;
      assert.equal(args.data.organizationId, 'org-1');
      assert.equal(args.data.name, 'My Key');
      assert.equal(args.data.keyPrefix, result.plaintextKey.slice(0, 12));
      assert.equal(args.data.keyHash, hashPlatformKey(result.plaintextKey));
      assert.equal(args.data.scopes, JSON.stringify(['read']));
      assert.equal(args.data.rateLimitPerMin, 60);
      assert.equal(args.data.rateLimitPerDay, 10000);
    });

    it('truncates long names to 200 characters', async () => {
      apiKeyCreateImpl = async (args: ApiKeyCreateArgs) => {
        assert.ok(args.data.name.length <= 200);
        return { id: 'key-1', ...args.data };
      };

      await ApiKeyService.create('org-1', {
        name: 'A'.repeat(300),
        createdBy: 'user-1',
      });
    });

    it('uses custom scopes and rate limits when provided', async () => {
      apiKeyCreateImpl = async (args: ApiKeyCreateArgs) => {
        assert.equal(args.data.scopes, JSON.stringify(['read', 'write']));
        assert.equal(args.data.rateLimitPerMin, 100);
        assert.equal(args.data.rateLimitPerDay, 50000);
        return { id: 'key-1', ...args.data };
      };

      await ApiKeyService.create('org-1', {
        name: 'My Key',
        scopes: ['read', 'write'],
        rateLimitPerMin: 100,
        rateLimitPerDay: 50000,
        createdBy: 'user-1',
      });
    });
  });

  describe('list', () => {
    it('returns API keys for an organization', async () => {
      apiKeyFindManyImpl = async () => [
        { id: 'key-1', name: 'Key 1', organizationId: 'org-1' },
        { id: 'key-2', name: 'Key 2', organizationId: 'org-1' },
      ];

      const result = await ApiKeyService.list('org-1');

      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'key-1');
      assert.equal(calls[0].method, 'platformApiKey.findMany');
      const args = calls[0].args as ApiKeyFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      apiKeyFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await ApiKeyService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('verify', () => {
    it('returns null for a key without the lnxt_ prefix', async () => {
      const result = await ApiKeyService.verify('invalid_key');

      assert.equal(result, null);
      // Should not have queried the database
      const findUniqueCalls = calls.filter((c) => c.method === 'platformApiKey.findUnique');
      assert.equal(findUniqueCalls.length, 0);
    });

    it('returns null when key is not found in the database', async () => {
      apiKeyFindUniqueImpl = async () => null;

      const plaintext = generatePlatformKey();
      const result = await ApiKeyService.verify(plaintext);

      assert.equal(result, null);
    });

    it('returns the key record when valid and active', async () => {
      const plaintext = generatePlatformKey();
      const keyHash = hashPlatformKey(plaintext);
      apiKeyFindUniqueImpl = async (args: ApiKeyFindUniqueArgs) => {
        assert.equal(args.where.keyHash, keyHash);
        return {
          id: 'key-1',
          organizationId: 'org-1',
          keyHash,
          revokedAt: null,
          expiresAt: null,
        };
      };
      apiKeyUpdateImpl = async () => ({ id: 'key-1' });

      const result = await ApiKeyService.verify(plaintext);

      assert.ok(result);
      assert.equal(result.id, 'key-1');
    });

    it('returns null when key is revoked', async () => {
      const plaintext = generatePlatformKey();
      apiKeyFindUniqueImpl = async () => ({
        id: 'key-1',
        keyHash: hashPlatformKey(plaintext),
        revokedAt: new Date(),
        expiresAt: null,
      });

      const result = await ApiKeyService.verify(plaintext);

      assert.equal(result, null);
    });

    it('returns null when key is expired', async () => {
      const plaintext = generatePlatformKey();
      apiKeyFindUniqueImpl = async () => ({
        id: 'key-1',
        keyHash: hashPlatformKey(plaintext),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10000), // expired 10s ago
      });

      const result = await ApiKeyService.verify(plaintext);

      assert.equal(result, null);
    });
  });

  describe('revoke', () => {
    it('revokes an API key with revokedBy', async () => {
      apiKeyUpdateImpl = async (args: ApiKeyUpdateArgs) => {
        assert.ok(args.data.revokedAt instanceof Date);
        assert.equal(args.data.revokedBy, 'user-1');
        return { id: 'key-1', revokedAt: args.data.revokedAt, revokedBy: 'user-1' };
      };

      const result = await ApiKeyService.revoke('key-1', 'user-1');

      assert.ok(result);
      assert.equal(calls[0].method, 'platformApiKey.update');
      const args = calls[0].args as ApiKeyUpdateArgs;
      assert.equal(args.where.id, 'key-1');
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      apiKeyUpdateImpl = async (args: ApiKeyUpdateArgs) => {
        assert.equal(args.data.name, 'New Name');
        assert.equal(args.data.description, undefined);
        return { id: 'key-1', name: 'New Name' };
      };

      const result = await ApiKeyService.update('key-1', { name: 'New Name' });

      assert.ok(result);
      assert.equal(calls[0].method, 'platformApiKey.update');
    });

    it('serializes scopes to JSON', async () => {
      apiKeyUpdateImpl = async (args: ApiKeyUpdateArgs) => {
        assert.equal(args.data.scopes, JSON.stringify(['read', 'write']));
        return { id: 'key-1' };
      };

      await ApiKeyService.update('key-1', { scopes: ['read', 'write'] });
    });
  });

  describe('getUsageStats', () => {
    it('aggregates usage stats for an API key', async () => {
      apiUsageLogFindManyImpl = async () => [
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 200, responseTimeMs: 50, rateLimited: false },
        { endpoint: '/api/v1/workspaces', method: 'GET', statusCode: 200, responseTimeMs: 100, rateLimited: false },
        { endpoint: '/api/platform/keys', method: 'POST', statusCode: 429, responseTimeMs: 10, rateLimited: true },
        { endpoint: '/api/platform/keys', method: 'POST', statusCode: 500, responseTimeMs: 200, rateLimited: false },
      ];

      const stats = await ApiKeyService.getUsageStats('key-1');

      assert.equal(stats.totalRequests, 4);
      assert.equal(stats.rateLimitedRequests, 1);
      assert.equal(stats.errorCount, 2); // 429 + 500
      assert.equal(stats.avgResponseTime, 90); // (50+100+10+200)/4 = 90
      assert.equal(stats.errorRate, 0.5);
      assert.ok(stats.byEndpoint.length >= 2);
      assert.ok(stats.byMethod.length >= 2);
      assert.ok(stats.byStatusCode.length >= 3);
    });

    it('returns zero stats when no logs', async () => {
      apiUsageLogFindManyImpl = async () => [];

      const stats = await ApiKeyService.getUsageStats('key-1');

      assert.equal(stats.totalRequests, 0);
      assert.equal(stats.errorCount, 0);
      assert.equal(stats.avgResponseTime, 0);
      assert.equal(stats.errorRate, 0);
    });

    it('returns empty stats on error (safePrisma fallback)', async () => {
      apiUsageLogFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await ApiKeyService.getUsageStats('key-1');

      assert.equal(stats.totalRequests, 0);
    });
  });
});
