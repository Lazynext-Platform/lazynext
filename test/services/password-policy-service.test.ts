import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup (only for prisma-dependent methods)
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
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  memory: {
    findFirst: (args: unknown): Promise<MemoryRecord | null> => {
      return memoryFindFirstImpl(args);
    },
    create: (args: unknown): Promise<MemoryRecord> => {
      return memoryCreateImpl(args);
    },
    deleteMany: (args: unknown): Promise<{ count: number }> => {
      return memoryDeleteManyImpl(args);
    },
    updateMany: (args: unknown): Promise<{ count: number }> => {
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

const { PasswordPolicyService } = await import('@/lib/services/password-policy-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — pure functions (no mocks needed)
// ─────────────────────────────────────────────────────────────────────────────

describe('PasswordPolicyService (pure)', () => {
  describe('validate', () => {
    it('validates a strong password', () => {
      const result = PasswordPolicyService.validate('Str0ng!Pass#2024');
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
      assert.ok(['weak', 'fair', 'good', 'strong'].includes(result.strength));
    });

    it('rejects a short password', () => {
      const result = PasswordPolicyService.validate('Short1!');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('at least')));
    });

    it('rejects missing uppercase', () => {
      const result = PasswordPolicyService.validate('alllowercase123!');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('uppercase')));
    });

    it('rejects missing lowercase', () => {
      const result = PasswordPolicyService.validate('ALLUPPERCASE123!');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('lowercase')));
    });

    it('rejects missing number', () => {
      const result = PasswordPolicyService.validate('NoNumbersHere!');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('number')));
    });

    it('rejects missing special character', () => {
      const result = PasswordPolicyService.validate('NoSpecial123');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('special')));
    });

    it('rejects common passwords', () => {
      const result = PasswordPolicyService.validate('password123');
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('common')));
    });
  });

  describe('checkStrength', () => {
    it('returns high score for strong passwords', () => {
      const score = PasswordPolicyService.checkStrength('MyV3ryStr0ng!P@ssw0rd#2024');
      assert.ok(score >= 80);
    });

    it('returns low score for weak passwords', () => {
      const score = PasswordPolicyService.checkStrength('abc');
      assert.ok(score < 40);
    });

    it('penalizes common passwords', () => {
      const score = PasswordPolicyService.checkStrength('password');
      assert.ok(score <= 20);
    });

    it('returns a score between 0 and 100', () => {
      const score1 = PasswordPolicyService.checkStrength('');
      const score2 = PasswordPolicyService.checkStrength('Aa1!Aa1!Aa1!Aa1!');
      assert.ok(score1 >= 0 && score1 <= 100);
      assert.ok(score2 >= 0 && score2 <= 100);
    });
  });

  describe('getPolicy', () => {
    it('returns the default policy', () => {
      const policy = PasswordPolicyService.getPolicy();
      assert.equal(policy.minLength, 12);
      assert.equal(policy.requireUppercase, true);
      assert.equal(policy.requireLowercase, true);
      assert.equal(policy.requireNumber, true);
      assert.equal(policy.requireSpecial, true);
      assert.equal(policy.preventReuse, 5);
      assert.equal(policy.expiryDays, 90);
    });
  });

  describe('getCommonPasswords', () => {
    it('returns an array of common passwords', () => {
      const common = PasswordPolicyService.getCommonPasswords();
      assert.ok(common.length >= 50);
      assert.ok(common.includes('password'));
      assert.ok(common.includes('123456'));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — prisma-dependent (mocked)
// ─────────────────────────────────────────────────────────────────────────────

describe('PasswordPolicyService (mocked)', () => {
  beforeEach(() => { resetMock(); });

  describe('checkHistory', () => {
    it('returns false when no history exists', async () => {
      const used = await PasswordPolicyService.checkHistory('user-1', 'TestPass123!');
      assert.equal(used, false);
    });

    it('returns true when password hash matches history', async () => {
      // Record a password first
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update('OldPass123!').digest('hex');
      await PasswordPolicyService.recordPassword('user-1', hash);

      const used = await PasswordPolicyService.checkHistory('user-1', 'OldPass123!');
      assert.equal(used, true);
    });
  });

  describe('recordPassword', () => {
    it('stores a password hash in history', async () => {
      const result = await PasswordPolicyService.recordPassword('user-1', 'abc123hash');
      assert.equal(result.recorded, true);
      assert.ok(memoryStore.size > 0);
    });
  });

  describe('getPolicyForOrg', () => {
    it('returns default policy when no custom policy exists', async () => {
      const policy = await PasswordPolicyService.getPolicyForOrg('org-1');
      assert.equal(policy.minLength, 12);
    });

    it('returns custom policy when set', async () => {
      await PasswordPolicyService.setPolicy('org-1', { minLength: 16 });
      const policy = await PasswordPolicyService.getPolicyForOrg('org-1');
      assert.equal(policy.minLength, 16);
    });
  });

  describe('isExpired', () => {
    it('returns false when no password change record exists', async () => {
      const expired = await PasswordPolicyService.isExpired('user-1', 'org-1');
      assert.equal(expired, false);
    });
  });
});
