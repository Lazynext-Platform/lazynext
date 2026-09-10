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

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'recovery_plan',
    content: JSON.stringify({
      name: 'IT System Recovery Plan',
      type: 'it_system',
      description: 'Recovery plan for IT systems',
      status: 'draft',
      scope: 'All IT systems',
      owner: 'IT Director',
      rto: '4 hours',
      rpo: '1 hour',
      priority: 'high',
      lastTested: null,
      nextTest: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['recovery_plan', 'it_system', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeBackupRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-b1',
    type: 'backup_strategy',
    content: JSON.stringify({
      name: 'Daily Full Backup',
      type: 'full',
      description: 'Daily full database backup',
      status: 'active',
      systemId: 'sys-1',
      frequency: 'Daily',
      retention: '30 days',
      storage: 'Cloud R2',
      encryption: 'AES-256',
      lastBackup: null,
      nextBackup: null,
      notes: '',
    }),
    tags: JSON.stringify(['backup_strategy', 'full', 'active']),
    ...overrides,
  });
}

function makeTestRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'recovery_test',
    content: JSON.stringify({
      name: 'Full Failover Test',
      type: 'full_failover',
      description: 'Complete system failover test',
      status: 'scheduled',
      planId: 'mem-1',
      testDate: '2028-01-01',
      duration: 180,
      scope: 'All systems',
      results: '',
      issues: '',
      improvements: '',
      notes: '',
    }),
    tags: JSON.stringify(['recovery_test', 'full_failover', 'scheduled']),
    ...overrides,
  });
}

function makeSiteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'recovery_site',
    content: JSON.stringify({
      name: 'Hot Site DC2',
      type: 'hot_site',
      description: 'Hot site at secondary data center',
      status: 'active',
      location: 'DC2 - East',
      capacity: 'Full',
      systems: 'All production systems',
      rto: '1 hour',
      rpo: '0',
      lastTested: null,
      notes: '',
    }),
    tags: JSON.stringify(['recovery_site', 'hot_site', 'active']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { DisasterRecoveryService } = await import('@/lib/services/disaster-recovery-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recovery Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('DisasterRecoveryService — Recovery Plans', () => {
  beforeEach(() => resetMock());

  it('creates a recovery plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await DisasterRecoveryService.createRecoveryPlan('org-1', 'ws-1', {
      name: 'Database Recovery', type: 'database',
    }, 'user-1');
    assert.equal(p.name, 'Database Recovery');
    assert.equal(p.status, 'draft');
    assert.equal(p.rto, '');
  });

  it('creates a recovery plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await DisasterRecoveryService.createRecoveryPlan('org-1', 'ws-1', {
      name: 'Cloud DR Plan', type: 'cloud', description: 'Cloud disaster recovery',
      status: 'approved', scope: 'Cloud infrastructure', owner: 'Cloud Architect',
      rto: '2 hours', rpo: '15 min', priority: 'critical',
      lastTested: '2028-01-01', nextTest: '2028-07-01', notes: 'Test quarterly',
    }, 'user-1');
    assert.equal(p.name, 'Cloud DR Plan');
    assert.equal(p.type, 'cloud');
    assert.equal(p.rto, '2 hours');
    assert.equal(p.rpo, '15 min');
  });

  it('gets a recovery plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await DisasterRecoveryService.getRecoveryPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'IT System Recovery Plan');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'backup_strategy' });
    const p = await DisasterRecoveryService.getRecoveryPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when recovery plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await DisasterRecoveryService.getRecoveryPlan('nope');
    assert.equal(p, null);
  });

  it('lists recovery plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recovery_plan') return [makeRow()];
      return [];
    };
    const list = await DisasterRecoveryService.listRecoveryPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'IT System Recovery Plan');
  });

  it('updates a recovery plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.updateRecoveryPlan('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a recovery plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await DisasterRecoveryService.deleteRecoveryPlan('mem-1');
    assert.equal(ok, true);
  });

  it('approveRecoveryPlan sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.approveRecoveryPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
  });

  it('activateRecoveryPlan sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.activateRecoveryPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('testRecoveryPlan sets status to tested', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.testRecoveryPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'tested');
  });

  it('deprecateRecoveryPlan sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.deprecateRecoveryPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'deprecated');
  });

  it('archiveRecoveryPlan sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await DisasterRecoveryService.archiveRecoveryPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Backup Strategies
// ─────────────────────────────────────────────────────────────────────────────

describe('DisasterRecoveryService — Backup Strategies', () => {
  beforeEach(() => resetMock());

  it('creates a backup strategy with defaults', async () => {
    memCreateImpl = async (args) => makeBackupRow({ content: args.data.content as string });
    const b = await DisasterRecoveryService.createBackupStrategy('org-1', 'ws-1', {
      name: 'Incremental Backup', type: 'incremental',
    }, 'user-1');
    assert.equal(b.name, 'Incremental Backup');
    assert.equal(b.status, 'active');
    assert.equal(b.frequency, '');
  });

  it('creates a backup strategy with full input', async () => {
    memCreateImpl = async (args) => makeBackupRow({ content: args.data.content as string });
    const b = await DisasterRecoveryService.createBackupStrategy('org-1', 'ws-1', {
      name: 'Mirror Backup', type: 'mirror', description: 'Real-time mirror backup',
      status: 'active', systemId: 'sys-2', frequency: 'Continuous',
      retention: '90 days', storage: 'R2 + S3', encryption: 'AES-256',
      lastBackup: '2028-01-01', nextBackup: '2028-02-01', notes: 'Critical system',
    }, 'user-1');
    assert.equal(b.name, 'Mirror Backup');
    assert.equal(b.type, 'mirror');
    assert.equal(b.frequency, 'Continuous');
    assert.equal(b.retention, '90 days');
  });

  it('gets a backup strategy by id', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    const b = await DisasterRecoveryService.getBackupStrategy('mem-b1');
    assert.ok(b);
    assert.equal(b!.name, 'Daily Full Backup');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeBackupRow({ type: 'recovery_plan' });
    const b = await DisasterRecoveryService.getBackupStrategy('mem-b1');
    assert.equal(b, null);
  });

  it('returns null when backup strategy not found', async () => {
    memFindUniqueImpl = async () => null;
    const b = await DisasterRecoveryService.getBackupStrategy('nope');
    assert.equal(b, null);
  });

  it('lists backup strategies by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'backup_strategy') return [makeBackupRow()];
      return [];
    };
    const list = await DisasterRecoveryService.listBackupStrategies('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a backup strategy', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    memUpdateImpl = async (args) => makeBackupRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await DisasterRecoveryService.updateBackupStrategy('mem-b1', { status: 'paused' });
    assert.ok(b);
    assert.equal(b!.status, 'paused');
  });

  it('deletes a backup strategy', async () => {
    memDeleteImpl = async () => ({ id: 'mem-b1' });
    const ok = await DisasterRecoveryService.deleteBackupStrategy('mem-b1');
    assert.equal(ok, true);
  });

  it('activateBackupStrategy sets status to active', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    memUpdateImpl = async (args) => makeBackupRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await DisasterRecoveryService.activateBackupStrategy('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'active');
  });

  it('pauseBackupStrategy sets status to paused', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    memUpdateImpl = async (args) => makeBackupRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await DisasterRecoveryService.pauseBackupStrategy('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'paused');
  });

  it('failBackupStrategy sets status to failed', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    memUpdateImpl = async (args) => makeBackupRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await DisasterRecoveryService.failBackupStrategy('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'failed');
  });

  it('deprecateBackupStrategy sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeBackupRow();
    memUpdateImpl = async (args) => makeBackupRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await DisasterRecoveryService.deprecateBackupStrategy('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recovery Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DisasterRecoveryService — Recovery Tests', () => {
  beforeEach(() => resetMock());

  it('creates a recovery test with defaults', async () => {
    memCreateImpl = async (args) => makeTestRow({ content: args.data.content as string });
    const t = await DisasterRecoveryService.createRecoveryTest('org-1', 'ws-1', {
      name: 'Data Restore Test', type: 'data_restore',
    }, 'user-1');
    assert.equal(t.name, 'Data Restore Test');
    assert.equal(t.status, 'scheduled');
    assert.equal(t.duration, 0);
  });

  it('creates a recovery test with full input', async () => {
    memCreateImpl = async (args) => makeTestRow({ content: args.data.content as string });
    const t = await DisasterRecoveryService.createRecoveryTest('org-1', 'ws-1', {
      name: 'Network Failover Test', type: 'network_failover', description: 'Network failover test',
      status: 'in_progress', planId: 'mem-1', testDate: '2028-05-01',
      duration: 60, scope: 'Core network', results: 'Successful',
      issues: 'Latency spike', improvements: 'Add redundant paths',
      notes: 'Monthly test',
    }, 'user-1');
    assert.equal(t.name, 'Network Failover Test');
    assert.equal(t.type, 'network_failover');
    assert.equal(t.duration, 60);
    assert.equal(t.scope, 'Core network');
  });

  it('gets a recovery test by id', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    const t = await DisasterRecoveryService.getRecoveryTest('mem-t1');
    assert.ok(t);
    assert.equal(t!.name, 'Full Failover Test');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTestRow({ type: 'recovery_plan' });
    const t = await DisasterRecoveryService.getRecoveryTest('mem-t1');
    assert.equal(t, null);
  });

  it('returns null when recovery test not found', async () => {
    memFindUniqueImpl = async () => null;
    const t = await DisasterRecoveryService.getRecoveryTest('nope');
    assert.equal(t, null);
  });

  it('lists recovery tests by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recovery_test') return [makeTestRow()];
      return [];
    };
    const list = await DisasterRecoveryService.listRecoveryTests('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recovery test', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.updateRecoveryTest('mem-t1', { status: 'completed' });
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('deletes a recovery test', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await DisasterRecoveryService.deleteRecoveryTest('mem-t1');
    assert.equal(ok, true);
  });

  it('scheduleRecoveryTest sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.scheduleRecoveryTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'scheduled');
  });

  it('startRecoveryTest sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.startRecoveryTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'in_progress');
  });

  it('completeRecoveryTest sets status to completed', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.completeRecoveryTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'completed');
  });

  it('failRecoveryTest sets status to failed', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.failRecoveryTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'failed');
  });

  it('cancelRecoveryTest sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeTestRow();
    memUpdateImpl = async (args) => makeTestRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await DisasterRecoveryService.cancelRecoveryTest('mem-t1', 'user-1');
    assert.ok(t);
    assert.equal(t!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Recovery Sites
// ─────────────────────────────────────────────────────────────────────────────

describe('DisasterRecoveryService — Recovery Sites', () => {
  beforeEach(() => resetMock());

  it('creates a recovery site with defaults', async () => {
    memCreateImpl = async (args) => makeSiteRow({ content: args.data.content as string });
    const s = await DisasterRecoveryService.createRecoverySite('org-1', 'ws-1', {
      name: 'Cold Site', type: 'cold_site',
    }, 'user-1');
    assert.equal(s.name, 'Cold Site');
    assert.equal(s.status, 'active');
    assert.equal(s.location, '');
  });

  it('creates a recovery site with full input', async () => {
    memCreateImpl = async (args) => makeSiteRow({ content: args.data.content as string });
    const s = await DisasterRecoveryService.createRecoverySite('org-1', 'ws-1', {
      name: 'Warm Site DC3', type: 'warm_site', description: 'Warm site at DC3',
      status: 'standby', location: 'DC3 - West', capacity: '50% of production',
      systems: 'Critical systems only', rto: '4 hours', rpo: '1 hour',
      lastTested: '2028-01-01', notes: 'Tested quarterly',
    }, 'user-1');
    assert.equal(s.name, 'Warm Site DC3');
    assert.equal(s.type, 'warm_site');
    assert.equal(s.location, 'DC3 - West');
    assert.equal(s.rto, '4 hours');
  });

  it('gets a recovery site by id', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    const s = await DisasterRecoveryService.getRecoverySite('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Hot Site DC2');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSiteRow({ type: 'recovery_plan' });
    const s = await DisasterRecoveryService.getRecoverySite('mem-s1');
    assert.equal(s, null);
  });

  it('returns null when recovery site not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await DisasterRecoveryService.getRecoverySite('nope');
    assert.equal(s, null);
  });

  it('lists recovery sites by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recovery_site') return [makeSiteRow()];
      return [];
    };
    const list = await DisasterRecoveryService.listRecoverySites('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a recovery site', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.updateRecoverySite('mem-s1', { status: 'standby' });
    assert.ok(s);
    assert.equal(s!.status, 'standby');
  });

  it('deletes a recovery site', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await DisasterRecoveryService.deleteRecoverySite('mem-s1');
    assert.equal(ok, true);
  });

  it('activateRecoverySite sets status to active', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.activateRecoverySite('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'active');
  });

  it('standbyRecoverySite sets status to standby', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.standbyRecoverySite('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'standby');
  });

  it('testRecoverySite sets status to testing', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.testRecoverySite('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'testing');
  });

  it('failRecoverySite sets status to failed', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.failRecoverySite('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'failed');
  });

  it('decommissionRecoverySite sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makeSiteRow();
    memUpdateImpl = async (args) => makeSiteRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await DisasterRecoveryService.decommissionRecoverySite('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('DisasterRecoveryService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getDisasterRecoveryMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recovery_plan') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'it_system', status: 'active', description: '', scope: '', owner: '', rto: '', rpo: '', priority: '', lastTested: null, nextTest: null, notes: '' }) }),
      ];
      if (t === 'backup_strategy') return [
        makeBackupRow({ content: JSON.stringify({ name: 'B1', type: 'full', status: 'active', description: '', systemId: null, frequency: '', retention: '', storage: '', encryption: '', lastBackup: null, nextBackup: null, notes: '' }) }),
      ];
      if (t === 'recovery_test') return [
        makeTestRow({ content: JSON.stringify({ name: 'T1', type: 'full_failover', status: 'scheduled', description: '', planId: null, testDate: null, duration: 0, scope: '', results: '', issues: '', improvements: '', notes: '' }) }),
        makeTestRow({ id: 't2', content: JSON.stringify({ name: 'T2', type: 'tabletop', status: 'completed', description: '', planId: null, testDate: null, duration: 0, scope: '', results: '', issues: '', improvements: '', notes: '' }) }),
      ];
      if (t === 'recovery_site') return [
        makeSiteRow({ content: JSON.stringify({ name: 'S1', type: 'hot_site', status: 'active', description: '', location: '', capacity: '', systems: '', rto: '', rpo: '', lastTested: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await DisasterRecoveryService.getDisasterRecoveryMetrics('org-1');
    assert.equal(m.activePlans, 1);
    assert.equal(m.activeBackups, 1);
    assert.equal(m.scheduledTests, 1);
    assert.equal(m.activeSites, 1);
    assert.equal(m.completedTests, 1);
  });

  it('getDisasterRecoveryStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'recovery_plan') return [makeRow()];
      if (t === 'backup_strategy') return [makeBackupRow()];
      if (t === 'recovery_test') return [makeTestRow()];
      if (t === 'recovery_site') return [makeSiteRow()];
      return [];
    };
    const s = await DisasterRecoveryService.getDisasterRecoveryStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.backupCount, 1);
    assert.equal(s.testCount, 1);
    assert.equal(s.siteCount, 1);
    assert.equal(s.byPlanType['it_system'], 1);
    assert.equal(s.byBackupType['full'], 1);
    assert.equal(s.byTestType['full_failover'], 1);
    assert.equal(s.bySiteType['hot_site'], 1);
  });
});
