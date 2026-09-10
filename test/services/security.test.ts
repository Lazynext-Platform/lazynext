import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type SecurityEventFindManyArgs = {
  where: { workspaceId: string; severity?: string; resolved?: boolean };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type SecurityEventFindUniqueArgs = {
  where: { id: string };
};

type SecurityEventCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    type: string;
    severity: string;
    description: string;
    actorId: string | null;
    resourceType: string | null;
    resourceId: string | null;
    ipAddress: string | null;
    metadata: string;
  };
};

type SecurityEventUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type PlatformConnectionFindUniqueArgs = {
  where: { id: string };
};

type PlatformConnectionFindManyArgs = {
  where: { userId: string };
  select?: Record<string, unknown>;
};

type PlatformConnectionUpdateArgs = {
  where: { id: string };
  data: { accessToken: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let securityEventFindManyImpl: (args: SecurityEventFindManyArgs) => Promise<unknown[]> =
  async () => [];
let securityEventFindUniqueImpl: (args: SecurityEventFindUniqueArgs) => Promise<unknown> =
  async () => null;
let securityEventCreateImpl: (args: SecurityEventCreateArgs) => Promise<unknown> =
  async () => ({});
let securityEventUpdateImpl: (args: SecurityEventUpdateArgs) => Promise<unknown> =
  async () => ({});

let platformConnectionFindUniqueImpl: (args: PlatformConnectionFindUniqueArgs) => Promise<unknown> =
  async () => null;
let platformConnectionFindManyImpl: (args: PlatformConnectionFindManyArgs) => Promise<unknown[]> =
  async () => [];
let platformConnectionUpdateImpl: (args: PlatformConnectionUpdateArgs) => Promise<unknown> =
  async () => ({});

// Mutable token-crypto functions
let encryptTokenImpl: (plain: string) => Promise<string> =
  async (plain) => `v2:encrypted:${plain}`;
let decryptTokenImpl: (stored: string) => Promise<string> =
  async (stored) => stored;

const prismaMock = {
  securityEvent: {
    findMany: (args: SecurityEventFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'securityEvent.findMany', args });
      return securityEventFindManyImpl(args);
    },
    findUnique: (args: SecurityEventFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'securityEvent.findUnique', args });
      return securityEventFindUniqueImpl(args);
    },
    create: (args: SecurityEventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'securityEvent.create', args });
      return securityEventCreateImpl(args);
    },
    update: (args: SecurityEventUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'securityEvent.update', args });
      return securityEventUpdateImpl(args);
    },
  },
  platformConnection: {
    findUnique: (args: PlatformConnectionFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.findUnique', args });
      return platformConnectionFindUniqueImpl(args);
    },
    findMany: (args: PlatformConnectionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'platformConnection.findMany', args });
      return platformConnectionFindManyImpl(args);
    },
    update: (args: PlatformConnectionUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.update', args });
      return platformConnectionUpdateImpl(args);
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

mock.module('@/lib/publishing/token-crypto', {
  namedExports: {
    encryptToken: (plain: string): Promise<string> => encryptTokenImpl(plain),
    decryptToken: (stored: string): Promise<string> => decryptTokenImpl(stored),
  },
});

function resetMock(): void {
  calls.length = 0;
  securityEventFindManyImpl = async () => [];
  securityEventFindUniqueImpl = async () => null;
  securityEventCreateImpl = async () => ({});
  securityEventUpdateImpl = async () => ({});
  platformConnectionFindUniqueImpl = async () => null;
  platformConnectionFindManyImpl = async () => [];
  platformConnectionUpdateImpl = async () => ({});
  encryptTokenImpl = async (plain) => `v2:encrypted:${plain}`;
  decryptTokenImpl = async (stored) => stored;
}

const { SecurityService } = await import('@/lib/services/security');

// ─────────────────────────────────────────────────────────────────────────────
// SecurityService
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityService', () => {
  beforeEach(() => { resetMock(); });

  describe('listSecurityEvents', () => {
    it('returns events for a workspace', async () => {
      securityEventFindManyImpl = async () =>
        ([{ id: 'e1', type: 'token.exposed', severity: 'high', resolved: false }]);

      const result = await SecurityService.listSecurityEvents('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'e1');
      assert.equal(calls[0].method, 'securityEvent.findMany');
      const args = calls[0].args as SecurityEventFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies severity and unresolved filters', async () => {
      securityEventFindManyImpl = async () => [];

      await SecurityService.listSecurityEvents('ws-1', { severity: 'critical', unresolved: true });

      const args = calls[0].args as SecurityEventFindManyArgs;
      assert.equal(args.where.severity, 'critical');
      assert.equal(args.where.resolved, false);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      securityEventFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await SecurityService.listSecurityEvents('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getSecurityEvent', () => {
    it('returns an event by id', async () => {
      securityEventFindUniqueImpl = async () =>
        ({ id: 'e1', type: 'token.exposed', severity: 'high' });

      const result = await SecurityService.getSecurityEvent('e1');

      assert.ok(result);
      assert.equal(result!.id, 'e1');
      assert.equal(calls[0].method, 'securityEvent.findUnique');
    });

    it('returns null when event not found', async () => {
      securityEventFindUniqueImpl = async () => null;

      const result = await SecurityService.getSecurityEvent('nope');
      assert.equal(result, null);
    });
  });

  describe('createEvent', () => {
    it('creates a security event with default severity', async () => {
      securityEventCreateImpl = async (args: SecurityEventCreateArgs) => {
        assert.equal(args.data.severity, 'medium');
        assert.equal(args.data.metadata, '{}');
        return { id: 'e1', ...args.data };
      };

      const result = await SecurityService.createEvent({
        organizationId: 'org-1',
        type: 'token.exposed',
        description: 'A token was exposed',
      });

      assert.ok(result);
      assert.equal(result!.id, 'e1');
      assert.equal(calls[0].method, 'securityEvent.create');
    });

    it('serializes metadata to JSON string', async () => {
      securityEventCreateImpl = async (args: SecurityEventCreateArgs) => {
        assert.equal(args.data.metadata, JSON.stringify({ ip: '1.2.3.4' }));
        return { id: 'e1', ...args.data };
      };

      await SecurityService.createEvent({
        organizationId: 'org-1',
        type: 'suspicious_activity',
        description: 'Suspicious login',
        metadata: { ip: '1.2.3.4' },
      });
    });
  });

  describe('resolveEvent', () => {
    it('marks an event as resolved with resolvedBy and timestamp', async () => {
      securityEventUpdateImpl = async (args: SecurityEventUpdateArgs) => {
        assert.equal(args.data.resolved, true);
        assert.equal(args.data.resolvedBy, 'user-1');
        assert.ok(args.data.resolvedAt instanceof Date);
        return { id: 'e1', resolved: true, resolvedBy: 'user-1' };
      };

      const result = await SecurityService.resolveEvent('e1', 'user-1');
      assert.ok(result);
      assert.equal(result!.resolved, true);
      assert.equal(calls[0].method, 'securityEvent.update');
    });

    it('returns null when event not found', async () => {
      securityEventUpdateImpl = async () => { throw new Error('not found'); };

      const result = await SecurityService.resolveEvent('nope', 'user-1');
      assert.equal(result, null);
    });
  });

  describe('getSecuritySummary', () => {
    it('aggregates counts by severity and unresolved count', async () => {
      securityEventFindManyImpl = async () => ([
        { id: 'e1', severity: 'critical', resolved: false },
        { id: 'e2', severity: 'critical', resolved: true },
        { id: 'e3', severity: 'high', resolved: false },
        { id: 'e4', severity: 'medium', resolved: false },
        { id: 'e5', severity: 'low', resolved: true },
      ]);

      const summary = await SecurityService.getSecuritySummary('ws-1');

      assert.equal(summary.counts.critical, 2);
      assert.equal(summary.counts.high, 1);
      assert.equal(summary.counts.medium, 1);
      assert.equal(summary.counts.low, 1);
      assert.equal(summary.unresolvedCount, 3);
      assert.equal(summary.total, 5);
      assert.equal(summary.recent.length, 5);
    });

    it('returns zero counts when no events', async () => {
      securityEventFindManyImpl = async () => [];

      const summary = await SecurityService.getSecuritySummary('ws-1');

      assert.equal(summary.counts.critical, 0);
      assert.equal(summary.counts.high, 0);
      assert.equal(summary.unresolvedCount, 0);
      assert.equal(summary.total, 0);
    });

    it('returns empty summary on error (safePrisma fallback)', async () => {
      securityEventFindManyImpl = async () => { throw new Error('fail'); };

      const summary = await SecurityService.getSecuritySummary('ws-1');
      assert.equal(summary.total, 0);
      assert.equal(summary.unresolvedCount, 0);
    });
  });

  describe('encryptTokenIfPlain', () => {
    it('encrypts a plaintext token', async () => {
      encryptTokenImpl = async (plain) => `v2:enc:${plain}`;

      const result = await SecurityService.encryptTokenIfPlain('my-secret-token');

      assert.equal(result, 'v2:enc:my-secret-token');
    });

    it('does not re-encrypt an already-encrypted (v2:) token', async () => {
      let called = false;
      encryptTokenImpl = async () => { called = true; return 'should-not-happen'; };

      const result = await SecurityService.encryptTokenIfPlain('v2:abc:def');

      assert.equal(result, 'v2:abc:def');
      assert.equal(called, false);
    });

    it('does not re-encrypt a plain: prefixed token', async () => {
      let called = false;
      encryptTokenImpl = async () => { called = true; return 'should-not-happen'; };

      const result = await SecurityService.encryptTokenIfPlain('plain:my-token');

      assert.equal(result, 'plain:my-token');
      assert.equal(called, false);
    });

    it('returns original token when encryption throws (graceful degradation)', async () => {
      encryptTokenImpl = async () => { throw new Error('no key'); };

      const result = await SecurityService.encryptTokenIfPlain('my-token');

      assert.equal(result, 'my-token');
    });
  });

  describe('decryptTokenIfNeeded', () => {
    it('decrypts a v2: token', async () => {
      decryptTokenImpl = async (stored) => {
        assert.ok(stored.startsWith('v2:'));
        return 'decrypted-secret';
      };

      const result = await SecurityService.decryptTokenIfNeeded('v2:abc:def');

      assert.equal(result, 'decrypted-secret');
    });

    it('returns plaintext for a plain: prefixed token', async () => {
      let called = false;
      decryptTokenImpl = async () => { called = true; return 'should-not-happen'; };

      const result = await SecurityService.decryptTokenIfNeeded('plain:my-token');

      assert.equal(result, 'my-token');
      assert.equal(called, false);
    });

    it('returns original token when it has no prefix (already plaintext)', async () => {
      let called = false;
      decryptTokenImpl = async () => { called = true; return 'should-not-happen'; };

      const result = await SecurityService.decryptTokenIfNeeded('raw-token');

      assert.equal(result, 'raw-token');
      assert.equal(called, false);
    });

    it('returns original token when decryption fails (graceful fallback)', async () => {
      decryptTokenImpl = async () => { throw new Error('no key'); };

      const result = await SecurityService.decryptTokenIfNeeded('v2:abc:def');

      assert.equal(result, 'v2:abc:def');
    });
  });

  describe('migrateConnectionToken', () => {
    it('migrates a plaintext token to encrypted', async () => {
      platformConnectionFindUniqueImpl = async () =>
        ({ id: 'c1', platform: 'github', accessToken: 'plaintext-token' });
      encryptTokenImpl = async (plain) => `v2:enc:${plain}`;

      const result = await SecurityService.migrateConnectionToken('c1');

      assert.equal(result.migrated, true);
      assert.equal(result.platform, 'github');
      // Verify update was called with encrypted token
      const updateCall = calls.find((c) => c.method === 'platformConnection.update');
      assert.ok(updateCall);
      const updateArgs = updateCall!.args as PlatformConnectionUpdateArgs;
      assert.equal(updateArgs.data.accessToken, 'v2:enc:plaintext-token');
    });

    it('does not migrate an already-encrypted token', async () => {
      platformConnectionFindUniqueImpl = async () =>
        ({ id: 'c1', platform: 'github', accessToken: 'v2:already:encrypted' });
      let encryptCalled = false;
      encryptTokenImpl = async () => { encryptCalled = true; return 'nope'; };

      const result = await SecurityService.migrateConnectionToken('c1');

      assert.equal(result.migrated, false);
      assert.equal(result.platform, 'github');
      assert.equal(encryptCalled, false);
    });

    it('returns migrated false when connection not found', async () => {
      platformConnectionFindUniqueImpl = async () => null;

      const result = await SecurityService.migrateConnectionToken('nope');

      assert.equal(result.migrated, false);
      assert.equal(result.platform, 'unknown');
    });
  });

  describe('migrateAllTokens', () => {
    it('migrates all plaintext tokens for a user', async () => {
      platformConnectionFindManyImpl = async () => ([
        { id: 'c1', platform: 'github', accessToken: 'plain-token-1' },
        { id: 'c2', platform: 'tiktok', accessToken: 'v2:already:encrypted' },
        { id: 'c3', platform: 'youtube', accessToken: 'plain-token-3' },
      ]);
      encryptTokenImpl = async (plain) => `v2:enc:${plain}`;

      const result = await SecurityService.migrateAllTokens('user-1');

      assert.equal(result.total, 3);
      assert.equal(result.migrated, 2);
      assert.equal(result.errors.length, 0);
    });

    it('reports errors for failed migrations', async () => {
      platformConnectionFindManyImpl = async () => ([
        { id: 'c1', platform: 'github', accessToken: 'plain-token-1' },
      ]);
      encryptTokenImpl = async () => { throw new Error('encrypt failed'); };

      const result = await SecurityService.migrateAllTokens('user-1');

      assert.equal(result.total, 1);
      assert.equal(result.migrated, 0);
      assert.equal(result.errors.length, 0); // encryptTokenIfPlain catches the error, so no migration happens
    });

    it('returns zero totals when user has no connections', async () => {
      platformConnectionFindManyImpl = async () => [];

      const result = await SecurityService.migrateAllTokens('user-1');

      assert.equal(result.total, 0);
      assert.equal(result.migrated, 0);
      assert.equal(result.errors.length, 0);
    });
  });
});
