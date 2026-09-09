import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const memoryStore: Map<string, MemoryRecord> = new Map();
let idCounter = 0;

let memoryFindFirstImpl: (args: unknown) => Promise<MemoryRecord | null> = async () => null;
let memoryFindManyImpl: (args: unknown) => Promise<MemoryRecord[]> = async () => [];
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  memory: {
    findFirst: (args: unknown): Promise<MemoryRecord | null> => memoryFindFirstImpl(args),
    findMany: (args: unknown): Promise<MemoryRecord[]> => memoryFindManyImpl(args),
    create: (args: unknown): Promise<MemoryRecord> => memoryCreateImpl(args),
    delete: (args: unknown): Promise<MemoryRecord> => memoryDeleteImpl(args),
    deleteMany: (args: unknown): Promise<{ count: number }> => memoryDeleteManyImpl(args),
    update: (args: unknown): Promise<MemoryRecord> => memoryUpdateImpl(args),
    updateMany: (args: unknown): Promise<{ count: number }> => memoryUpdateManyImpl(args),
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
  memoryStore.clear();
  idCounter = 0;

  memoryFindFirstImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string } };
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      return rec;
    }
    return null;
  };

  memoryFindManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string } };
    const results: MemoryRecord[] = [];
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      results.push(rec);
    }
    results.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
    return results;
  };

  memoryCreateImpl = async (args: unknown) => {
    const a = args as { data: Partial<MemoryRecord> };
    const id = `mem-${++idCounter}`;
    const now = new Date();
    const rec: MemoryRecord = {
      id,
      workspaceId: a.data.workspaceId || 'ws',
      organizationId: a.data.organizationId || 'org',
      type: a.data.type || '',
      content: a.data.content || '{}',
      source: a.data.source || 'system',
      sourceId: a.data.sourceId || null,
      confidence: a.data.confidence || 0.5,
      owner: a.data.owner || null,
      lifecycle: a.data.lifecycle || 'medium',
      tags: a.data.tags || '[]',
      createdBy: a.data.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.set(id, rec);
    return rec;
  };

  memoryDeleteImpl = async (args: unknown) => {
    const a = args as { where: { id: string } };
    const rec = memoryStore.get(a.where.id);
    if (rec) memoryStore.delete(a.where.id);
    return rec || ({} as MemoryRecord);
  };

  memoryDeleteManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string } };
    let count = 0;
    for (const [id, rec] of memoryStore.entries()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      memoryStore.delete(id);
      count++;
    }
    return { count };
  };

  memoryUpdateImpl = async (args: unknown) => {
    const a = args as { where: { id: string }, data: { content?: string } };
    const rec = memoryStore.get(a.where.id);
    if (rec) {
      if (a.data.content !== undefined) rec.content = a.data.content;
      rec.updatedAt = new Date();
    }
    return rec || ({} as MemoryRecord);
  };

  memoryUpdateManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string }, data: { content?: string } };
    let count = 0;
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      if (a.data.content !== undefined) rec.content = a.data.content;
      count++;
    }
    return { count };
  };
}

const { SecurityKeyService } = await import('@/lib/services/security-key-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityKeyService', () => {
  beforeEach(() => { resetMock(); });

  describe('generateRegistrationChallenge', () => {
    it('generates a challenge and stores it', async () => {
      const result = await SecurityKeyService.generateRegistrationChallenge('user-1');

      assert.ok(result.challenge);
      assert.equal(result.rpId, 'lazynext.app');
      assert.equal(result.rpName, 'Lazynext');
      assert.equal(result.userId, 'user-1');
      assert.equal(result.timeout, 60000);

      // Check it was stored
      const stored = Array.from(memoryStore.values()).find((r) => r.type === 'security_key_challenge');
      assert.ok(stored);
      const content = JSON.parse(stored.content);
      assert.equal(content.challenge, result.challenge);
    });
  });

  describe('verifyRegistration', () => {
    it('throws when no active challenge exists', async () => {
      await assert.rejects(
        () => SecurityKeyService.verifyRegistration('user-1', {
          credentialId: 'cred-1',
          publicKey: 'pub-1',
        }),
        /No active registration challenge/,
      );
    });

    it('stores credential on successful verification', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');

      const result = await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
        name: 'My YubiKey',
      });

      assert.equal(result.verified, true);
      assert.equal(result.credentialId, 'cred-1');

      // Check credential was stored
      const keys = Array.from(memoryStore.values()).filter((r) => r.type === 'security_key');
      assert.equal(keys.length, 1);
      const content = JSON.parse(keys[0].content);
      assert.equal(content.credentialId, 'cred-1');
      assert.equal(content.name, 'My YubiKey');
    });

    it('throws when credentialId is missing', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');

      await assert.rejects(
        () => SecurityKeyService.verifyRegistration('user-1', {
          credentialId: '',
          publicKey: 'pub-1',
        }),
        /Missing credential ID or public key/,
      );
    });
  });

  describe('generateAuthChallenge', () => {
    it('generates an auth challenge', async () => {
      const result = await SecurityKeyService.generateAuthChallenge('user-1');

      assert.ok(result.challenge);
      assert.equal(result.rpId, 'lazynext.app');
      assert.equal(result.userId, 'user-1');
      assert.equal(result.timeout, 60000);
    });
  });

  describe('verifyAuth', () => {
    it('throws when no active challenge exists', async () => {
      await assert.rejects(
        () => SecurityKeyService.verifyAuth('user-1', { credentialId: 'cred-1' }),
        /No active authentication challenge/,
      );
    });

    it('throws when credential not found', async () => {
      await SecurityKeyService.generateAuthChallenge('user-1');

      await assert.rejects(
        () => SecurityKeyService.verifyAuth('user-1', { credentialId: 'nonexistent' }),
        /Credential not found/,
      );
    });

    it('verifies auth with a registered key', async () => {
      // Register a key first
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
      });

      // Now auth
      await SecurityKeyService.generateAuthChallenge('user-1');
      const result = await SecurityKeyService.verifyAuth('user-1', { credentialId: 'cred-1' });

      assert.equal(result.verified, true);
      assert.equal(result.credentialId, 'cred-1');
    });
  });

  describe('listKeys', () => {
    it('returns empty array when no keys exist', async () => {
      const keys = await SecurityKeyService.listKeys('user-1');
      assert.deepEqual(keys, []);
    });

    it('lists registered keys', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
        name: 'Key 1',
      });

      const keys = await SecurityKeyService.listKeys('user-1');
      assert.equal(keys.length, 1);
      assert.equal(keys[0].credentialId, 'cred-1');
      assert.equal(keys[0].name, 'Key 1');
    });
  });

  describe('removeKey', () => {
    it('removes a key by credential ID', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
      });

      const result = await SecurityKeyService.removeKey('user-1', 'cred-1');
      assert.equal(result.removed, true);

      const keys = await SecurityKeyService.listKeys('user-1');
      assert.equal(keys.length, 0);
    });

    it('returns removed false when key not found', async () => {
      const result = await SecurityKeyService.removeKey('user-1', 'nonexistent');
      assert.equal(result.removed, false);
    });
  });

  describe('renameKey', () => {
    it('renames a key', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
        name: 'Old Name',
      });

      const result = await SecurityKeyService.renameKey('user-1', 'cred-1', 'New Name');
      assert.equal(result.renamed, true);

      const keys = await SecurityKeyService.listKeys('user-1');
      assert.equal(keys[0].name, 'New Name');
    });

    it('returns renamed false when key not found', async () => {
      const result = await SecurityKeyService.renameKey('user-1', 'nonexistent', 'New Name');
      assert.equal(result.renamed, false);
    });
  });

  describe('getKeyCount', () => {
    it('returns 0 when no keys exist', async () => {
      const count = await SecurityKeyService.getKeyCount('user-1');
      assert.equal(count, 0);
    });

    it('returns the number of registered keys', async () => {
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-1',
        publicKey: 'pub-1',
      });
      await SecurityKeyService.generateRegistrationChallenge('user-1');
      await SecurityKeyService.verifyRegistration('user-1', {
        credentialId: 'cred-2',
        publicKey: 'pub-2',
      });

      const count = await SecurityKeyService.getKeyCount('user-1');
      assert.equal(count, 2);
    });
  });
});
