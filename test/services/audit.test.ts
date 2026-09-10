import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type AuditFindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type AuditCreateArgs = { data: Record<string, unknown> };

let auditFindManyImpl: (args: AuditFindManyArgs) => Promise<unknown[]> = async () => [];
let auditCreateImpl: (args: AuditCreateArgs) => Promise<unknown> = async () => ({});
let auditCreateShouldThrow = false;

const prismaMock = {
  auditEvent: {
    findMany: (args: AuditFindManyArgs): Promise<unknown[]> => { calls.push({ method: 'auditEvent.findMany', args }); return auditFindManyImpl(args); },
    create: (args: AuditCreateArgs): Promise<unknown> => {
      calls.push({ method: 'auditEvent.create', args });
      if (auditCreateShouldThrow) return Promise.reject(new Error('db down'));
      return auditCreateImpl(args);
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

function makeAuditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'audit-1',
    userId: 'user-1',
    workspaceId: 'ws-1',
    action: 'auth.login',
    targetType: 'session',
    targetId: 'sess-1',
    metadata: JSON.stringify({ ip: '127.0.0.1' }),
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  auditFindManyImpl = async () => [];
  auditCreateImpl = async () => ({});
  auditCreateShouldThrow = false;
}

const { AuditService, AuditActions } = await import('@/lib/services/audit');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — AuditService
// ─────────────────────────────────────────────────────────────────────────────

describe('AuditService', () => {
  beforeEach(() => resetMock());

  it('logs an audit event with full input', async () => {
    auditCreateImpl = async (args) => makeAuditRow({ ...args.data as Record<string, unknown> });
    await AuditService.log({
      userId: 'user-1', workspaceId: 'ws-1', action: 'auth.login',
      targetType: 'session', targetId: 'sess-1', metadata: { ip: '127.0.0.1' },
      ip: '127.0.0.1', userAgent: 'Mozilla/5.0',
    });
    const createCall = calls.find((c) => c.method === 'auditEvent.create');
    assert.ok(createCall);
    const data = (createCall!.args as { data: Record<string, unknown> }).data;
    assert.equal(data.action, 'auth.login');
    assert.equal(data.userId, 'user-1');
    assert.equal(data.metadata, JSON.stringify({ ip: '127.0.0.1' }));
  });

  it('logs an audit event with defaults (nulls for optional fields)', async () => {
    auditCreateImpl = async (args) => makeAuditRow({ ...args.data as Record<string, unknown> });
    await AuditService.log({ action: 'api.request' });
    const createCall = calls.find((c) => c.method === 'auditEvent.create');
    assert.ok(createCall);
    const data = (createCall!.args as { data: Record<string, unknown> }).data;
    assert.equal(data.action, 'api.request');
    assert.equal(data.userId, null);
    assert.equal(data.workspaceId, null);
    assert.equal(data.metadata, null);
  });

  it('does not throw when create fails (swallows errors)', async () => {
    auditCreateShouldThrow = true;
    await AuditService.log({ action: 'auth.login' });
    // Should not throw — audit logging never breaks the request
    assert.ok(true);
  });

  it('listForWorkspace returns events for a workspace', async () => {
    auditFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.workspaceId === 'ws-1') return [makeAuditRow()];
      return [];
    };
    const list = await AuditService.listForWorkspace('ws-1');
    assert.equal(list.length, 1);
    assert.ok(list[0]);
    assert.equal((list[0] as { action: string }).action, 'auth.login');
  });

  it('listForWorkspace respects limit', async () => {
    auditFindManyImpl = async (args) => {
      assert.equal(args.take, 10);
      return [makeAuditRow()];
    };
    const list = await AuditService.listForWorkspace('ws-1', 10);
    assert.equal(list.length, 1);
  });

  it('listForUser returns events for a user', async () => {
    auditFindManyImpl = async (args) => {
      const where = args.where as Record<string, unknown>;
      if (where.userId === 'user-1') return [makeAuditRow()];
      return [];
    };
    const list = await AuditService.listForUser('user-1');
    assert.equal(list.length, 1);
    assert.ok(list[0]);
    assert.equal((list[0] as { action: string }).action, 'auth.login');
  });

  it('listForUser respects limit', async () => {
    auditFindManyImpl = async (args) => {
      assert.equal(args.take, 5);
      return [];
    };
    const list = await AuditService.listForUser('user-1', 5);
    assert.equal(list.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — AuditActions constants
// ─────────────────────────────────────────────────────────────────────────────

describe('AuditActions', () => {
  it('exposes auth action constants', () => {
    assert.equal(AuditActions.AUTH_LOGIN, 'auth.login');
    assert.equal(AuditActions.AUTH_LOGOUT, 'auth.logout');
    assert.equal(AuditActions.AUTH_FAILED, 'auth.failed');
    assert.equal(AuditActions.AUTH_SIGNUP, 'auth.signup');
  });

  it('exposes workspace and member action constants', () => {
    assert.equal(AuditActions.WORKSPACE_CREATE, 'workspace.create');
    assert.equal(AuditActions.MEMBER_ADD, 'member.add');
    assert.equal(AuditActions.MEMBER_REMOVE, 'member.remove');
  });
});
