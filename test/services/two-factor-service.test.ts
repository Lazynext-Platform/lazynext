import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { TotpService } from '@/lib/services/totp-service';

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

interface CallRecord {
  method: string;
  args?: unknown;
}
const calls: CallRecord[] = [];

let memoryFindFirstImpl: (args: unknown) => Promise<MemoryRecord | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  memory: {
    findFirst: (args: unknown): Promise<MemoryRecord | null> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    deleteMany: (args: unknown): Promise<{ count: number }> => {
      calls.push({ method: 'memory.deleteMany', args });
      return memoryDeleteManyImpl(args);
    },
    updateMany: (args: unknown): Promise<{ count: number }> => {
      calls.push({ method: 'memory.updateMany', args });
      return memoryUpdateManyImpl(args);
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
  memoryStore.clear();
  idCounter = 0;

  memoryFindFirstImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string } };
    for (const rec of memoryStore.values()) {
      if (rec.type === a.where.type && (a.where.sourceId === undefined || rec.sourceId === a.where.sourceId)) {
        return rec;
      }
    }
    return null;
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

  memoryDeleteManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string | { in: string[] }; sourceId?: string } };
    let count = 0;
    for (const [id, rec] of memoryStore.entries()) {
      const typeVal = a.where.type;
      const typeMatch = typeof typeVal === 'string'
        ? rec.type === typeVal
        : typeVal.in.includes(rec.type);
      const sourceMatch = a.where.sourceId === undefined || rec.sourceId === a.where.sourceId;
      if (typeMatch && sourceMatch) {
        memoryStore.delete(id);
        count++;
      }
    }
    return { count };
  };

  memoryUpdateManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string | { in: string[] }; sourceId?: string }, data: { content?: string } };
    let count = 0;
    for (const rec of memoryStore.values()) {
      const typeVal = a.where.type;
      const typeMatch = typeof typeVal === 'string'
        ? rec.type === typeVal
        : typeVal.in.includes(rec.type);
      const sourceMatch = a.where.sourceId === undefined || rec.sourceId === a.where.sourceId;
      if (typeMatch && sourceMatch) {
        if (a.data.content !== undefined) rec.content = a.data.content;
        rec.updatedAt = new Date();
        count++;
      }
    }
    return { count };
  };
}

const { TwoFactorService } = await import('@/lib/services/two-factor-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TwoFactorService', () => {
  beforeEach(() => { resetMock(); });

  describe('setup', () => {
    it('generates a secret and stores it (not enabled)', async () => {
      const result = await TwoFactorService.setup('user-1', 'user@test.com');

      assert.ok(result.secret);
      assert.ok(result.uri.startsWith('otpauth://totp/'));
      assert.equal(result.qrDataUrl, null);

      // Check it was stored
      const stored = memoryStore.values().next().value;
      assert.ok(stored);
      assert.equal(stored.type, 'two_factor_secret');
      const content = JSON.parse(stored.content);
      assert.equal(content.enabled, false);
    });

    it('deletes existing setup before creating new one', async () => {
      await TwoFactorService.setup('user-1');
      assert.equal(memoryStore.size, 1);

      await TwoFactorService.setup('user-1');
      // deleteMany should have been called, then create
      assert.equal(memoryStore.size, 1);
    });
  });

  describe('verify', () => {
    it('enables 2FA with a valid code and returns backup codes', async () => {
      const setupResult = await TwoFactorService.setup('user-1');
      const time = Math.floor(Date.now() / 1000);
      const code = TotpService.generateCode(setupResult.secret, time);

      const result = await TwoFactorService.verify('user-1', code);

      assert.equal(result.enabled, true);
      assert.ok(result.backupCodes.length > 0);
    });

    it('throws when setup not initiated', async () => {
      await assert.rejects(
        () => TwoFactorService.verify('user-1', '123456'),
        /2FA setup not initiated/,
      );
    });

    it('throws with an invalid code', async () => {
      await TwoFactorService.setup('user-1');
      await assert.rejects(
        () => TwoFactorService.verify('user-1', '000000'),
        /Invalid verification code/,
      );
    });
  });

  describe('isEnabled', () => {
    it('returns false when no setup exists', async () => {
      const enabled = await TwoFactorService.isEnabled('user-1');
      assert.equal(enabled, false);
    });

    it('returns false when setup exists but not enabled', async () => {
      await TwoFactorService.setup('user-1');
      const enabled = await TwoFactorService.isEnabled('user-1');
      assert.equal(enabled, false);
    });
  });

  describe('disable', () => {
    it('removes all 2FA records', async () => {
      await TwoFactorService.setup('user-1');
      assert.ok(memoryStore.size > 0);

      const result = await TwoFactorService.disable('user-1');
      assert.equal(result.disabled, true);
      assert.equal(memoryStore.size, 0);
    });

    it('throws with invalid code when code is provided', async () => {
      await TwoFactorService.setup('user-1');
      await assert.rejects(
        () => TwoFactorService.disable('user-1', '000000'),
        /Invalid verification code/,
      );
    });
  });

  describe('verifyLogin', () => {
    it('returns verified false when 2FA not enabled', async () => {
      const result = await TwoFactorService.verifyLogin('user-1', '123456');
      assert.equal(result.verified, false);
    });
  });

  describe('getBackupCodes', () => {
    it('returns empty array when no backup codes exist', async () => {
      const codes = await TwoFactorService.getBackupCodes('user-1');
      assert.deepEqual(codes, []);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('throws when 2FA not enabled', async () => {
      await assert.rejects(
        () => TwoFactorService.regenerateBackupCodes('user-1', '123456'),
        /2FA not enabled/,
      );
    });
  });

  describe('getStatus', () => {
    it('returns disabled status when no setup exists', async () => {
      const status = await TwoFactorService.getStatus('user-1');
      assert.equal(status.enabled, false);
      assert.equal(status.hasBackupCodes, false);
      assert.equal(status.setupAt, null);
    });

    it('returns setup status when setup exists but not enabled', async () => {
      await TwoFactorService.setup('user-1');
      const status = await TwoFactorService.getStatus('user-1');
      assert.equal(status.enabled, false);
      assert.ok(status.setupAt);
    });
  });
});
