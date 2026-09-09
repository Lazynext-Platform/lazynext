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
    type: 'visitor_visit',
    content: JSON.stringify({
      visitorName: 'John Smith',
      type: 'business',
      description: 'Business meeting',
      status: 'pre_registered',
      hostId: 'mem-h1',
      hostName: 'Jane Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '555-0100',
      purpose: 'Quarterly review',
      expectedArrival: '2028-01-15T10:00:00.000Z',
      expectedDeparture: '2028-01-15T12:00:00.000Z',
      actualArrival: null,
      actualDeparture: null,
      escortRequired: false,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['visitor_visit', 'business', 'pre_registered']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeBadgeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-b1',
    type: 'visitor_badge',
    content: JSON.stringify({
      visitId: 'mem-1',
      type: 'visitor',
      description: 'Standard visitor badge',
      status: 'issued',
      badgeNumber: 'V-001',
      issuedAt: '2028-01-15T10:00:00.000Z',
      returnedAt: null,
      printedBy: 'Reception',
      accessLevel: 'lobby',
      validAreas: ['lobby', 'conference_room'],
      expiresAt: '2028-01-15T18:00:00.000Z',
      notes: '',
    }),
    tags: JSON.stringify(['visitor_badge', 'visitor', 'issued']),
    ...overrides,
  });
}

function makeHostRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-h1',
    type: 'visitor_host',
    content: JSON.stringify({
      name: 'Jane Doe',
      type: 'employee',
      description: 'Engineering manager',
      status: 'active',
      department: 'Engineering',
      email: 'jane@company.com',
      phone: '555-0200',
      location: 'Floor 3',
      notes: '',
    }),
    tags: JSON.stringify(['visitor_host', 'employee', 'active']),
    ...overrides,
  });
}

function makeLogRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'visitor_access_log',
    content: JSON.stringify({
      visitId: 'mem-1',
      badgeId: 'mem-b1',
      type: 'check_in',
      description: 'Visitor checked in at reception',
      status: 'recorded',
      timestamp: '2028-01-15T10:05:00.000Z',
      location: 'Main Lobby',
      officer: 'Guard A',
      outcome: 'granted',
      notes: '',
    }),
    tags: JSON.stringify(['visitor_access_log', 'check_in', 'recorded']),
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

const { VisitorManagementService } = await import('@/lib/services/visitor-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Visits
// ─────────────────────────────────────────────────────────────────────────────

describe('VisitorManagementService — Visits', () => {
  beforeEach(() => resetMock());

  it('creates a visit with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const v = await VisitorManagementService.createVisit('org-1', 'ws-1', {
      visitorName: 'Alice Brown', type: 'interview',
    }, 'user-1');
    assert.equal(v.visitorName, 'Alice Brown');
    assert.equal(v.status, 'pre_registered');
    assert.equal(v.escortRequired, false);
    assert.equal(v.company, '');
  });

  it('creates a visit with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const v = await VisitorManagementService.createVisit('org-1', 'ws-1', {
      visitorName: 'Bob Wilson', type: 'contractor', description: 'IT contractor visit',
      status: 'checked_in', hostId: 'mem-h1', hostName: 'Jane Doe',
      company: 'TechCo', email: 'bob@techco.com', phone: '555-0300',
      purpose: 'Server maintenance', expectedArrival: '2028-02-01T09:00:00.000Z',
      expectedDeparture: '2028-02-01T17:00:00.000Z', actualArrival: '2028-02-01T09:05:00.000Z',
      escortRequired: true, notes: 'Bring tools',
    }, 'user-1');
    assert.equal(v.visitorName, 'Bob Wilson');
    assert.equal(v.type, 'contractor');
    assert.equal(v.company, 'TechCo');
    assert.equal(v.escortRequired, true);
  });

  it('gets a visit by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const v = await VisitorManagementService.getVisit('mem-1');
    assert.ok(v);
    assert.equal(v!.id, 'mem-1');
    assert.equal(v!.visitorName, 'John Smith');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'visitor_badge' });
    const v = await VisitorManagementService.getVisit('mem-1');
    assert.equal(v, null);
  });

  it('returns null when visit not found', async () => {
    memFindUniqueImpl = async () => null;
    const v = await VisitorManagementService.getVisit('nope');
    assert.equal(v, null);
  });

  it('lists visits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_visit') return [makeRow()];
      return [];
    };
    const list = await VisitorManagementService.listVisits('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].visitorName, 'John Smith');
  });

  it('updates a visit', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.updateVisit('mem-1', { status: 'checked_in' });
    assert.ok(v);
    assert.equal(v!.status, 'checked_in');
  });

  it('deletes a visit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await VisitorManagementService.deleteVisit('mem-1');
    assert.equal(ok, true);
  });

  it('checkIn sets status to checked_in', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.checkIn('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'checked_in');
  });

  it('checkOut sets status to checked_out', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.checkOut('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'checked_out');
  });

  it('denyVisit sets status to denied', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.denyVisit('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'denied');
  });

  it('cancelVisit sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.cancelVisit('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'cancelled');
  });

  it('expireVisit sets status to expired', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const v = await VisitorManagementService.expireVisit('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Badges
// ─────────────────────────────────────────────────────────────────────────────

describe('VisitorManagementService — Badges', () => {
  beforeEach(() => resetMock());

  it('creates a badge with defaults', async () => {
    memCreateImpl = async (args) => makeBadgeRow({ content: args.data.content as string });
    const b = await VisitorManagementService.createBadge('org-1', 'ws-1', {
      visitId: 'mem-1', type: 'visitor',
    }, 'user-1');
    assert.equal(b.visitId, 'mem-1');
    assert.equal(b.status, 'issued');
    assert.equal(b.badgeNumber, '');
    assert.equal(b.validAreas.length, 0);
  });

  it('creates a badge with full input', async () => {
    memCreateImpl = async (args) => makeBadgeRow({ content: args.data.content as string });
    const b = await VisitorManagementService.createBadge('org-1', 'ws-1', {
      visitId: 'mem-1', type: 'vip', description: 'VIP badge',
      status: 'active', badgeNumber: 'VIP-001',
      issuedAt: '2028-03-01T10:00:00.000Z', printedBy: 'Security',
      accessLevel: 'all', validAreas: ['lobby', 'exec_floor', 'server_room'],
      expiresAt: '2028-03-01T20:00:00.000Z', notes: 'VIP access',
    }, 'user-1');
    assert.equal(b.badgeNumber, 'VIP-001');
    assert.equal(b.type, 'vip');
    assert.equal(b.accessLevel, 'all');
    assert.equal(b.validAreas.length, 3);
  });

  it('gets a badge by id', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    const b = await VisitorManagementService.getBadge('mem-b1');
    assert.ok(b);
    assert.equal(b!.badgeNumber, 'V-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeBadgeRow({ type: 'visitor_visit' });
    const b = await VisitorManagementService.getBadge('mem-b1');
    assert.equal(b, null);
  });

  it('returns null when badge not found', async () => {
    memFindUniqueImpl = async () => null;
    const b = await VisitorManagementService.getBadge('nope');
    assert.equal(b, null);
  });

  it('lists badges by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_badge') return [makeBadgeRow()];
      return [];
    };
    const list = await VisitorManagementService.listBadges('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a badge', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.updateBadge('mem-b1', { status: 'active' });
    assert.ok(b);
    assert.equal(b!.status, 'active');
  });

  it('deletes a badge', async () => {
    memDeleteImpl = async () => ({ id: 'mem-b1' });
    const ok = await VisitorManagementService.deleteBadge('mem-b1');
    assert.equal(ok, true);
  });

  it('activateBadge sets status to active', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.activateBadge('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'active');
  });

  it('returnBadge sets status to returned', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.returnBadge('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'returned');
  });

  it('loseBadge sets status to lost', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.loseBadge('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'lost');
  });

  it('expireBadge sets status to expired', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.expireBadge('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'expired');
  });

  it('revokeBadge sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeBadgeRow();
    memUpdateImpl = async (args) => makeBadgeRow({ id: 'mem-b1', content: args.data.content as string });
    const b = await VisitorManagementService.revokeBadge('mem-b1', 'user-1');
    assert.ok(b);
    assert.equal(b!.status, 'revoked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Hosts
// ─────────────────────────────────────────────────────────────────────────────

describe('VisitorManagementService — Hosts', () => {
  beforeEach(() => resetMock());

  it('creates a host with defaults', async () => {
    memCreateImpl = async (args) => makeHostRow({ content: args.data.content as string });
    const h = await VisitorManagementService.createHost('org-1', 'ws-1', {
      name: 'John Host', type: 'employee',
    }, 'user-1');
    assert.equal(h.name, 'John Host');
    assert.equal(h.status, 'active');
    assert.equal(h.department, '');
  });

  it('creates a host with full input', async () => {
    memCreateImpl = async (args) => makeHostRow({ content: args.data.content as string });
    const h = await VisitorManagementService.createHost('org-1', 'ws-1', {
      name: 'Security Team', type: 'security', description: 'Security desk',
      status: 'active', department: 'Security', email: 'security@company.com',
      phone: '555-0900', location: 'Main Entrance', notes: '24/7 coverage',
    }, 'user-1');
    assert.equal(h.name, 'Security Team');
    assert.equal(h.type, 'security');
    assert.equal(h.department, 'Security');
  });

  it('gets a host by id', async () => {
    memFindUniqueImpl = async () => makeHostRow();
    const h = await VisitorManagementService.getHost('mem-h1');
    assert.ok(h);
    assert.equal(h!.name, 'Jane Doe');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeHostRow({ type: 'visitor_visit' });
    const h = await VisitorManagementService.getHost('mem-h1');
    assert.equal(h, null);
  });

  it('returns null when host not found', async () => {
    memFindUniqueImpl = async () => null;
    const h = await VisitorManagementService.getHost('nope');
    assert.equal(h, null);
  });

  it('lists hosts by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_host') return [makeHostRow()];
      return [];
    };
    const list = await VisitorManagementService.listHosts('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a host', async () => {
    memFindUniqueImpl = async () => makeHostRow();
    memUpdateImpl = async (args) => makeHostRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await VisitorManagementService.updateHost('mem-h1', { department: 'R&D' });
    assert.ok(h);
    assert.equal(h!.department, 'R&D');
  });

  it('deletes a host', async () => {
    memDeleteImpl = async () => ({ id: 'mem-h1' });
    const ok = await VisitorManagementService.deleteHost('mem-h1');
    assert.equal(ok, true);
  });

  it('deactivateHost sets status to inactive', async () => {
    memFindUniqueImpl = async () => makeHostRow();
    memUpdateImpl = async (args) => makeHostRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await VisitorManagementService.deactivateHost('mem-h1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'inactive');
  });

  it('unavailableHost sets status to unavailable', async () => {
    memFindUniqueImpl = async () => makeHostRow();
    memUpdateImpl = async (args) => makeHostRow({ id: 'mem-h1', content: args.data.content as string });
    const h = await VisitorManagementService.unavailableHost('mem-h1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'unavailable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Access Logs
// ─────────────────────────────────────────────────────────────────────────────

describe('VisitorManagementService — Access Logs', () => {
  beforeEach(() => resetMock());

  it('creates an access log with defaults', async () => {
    memCreateImpl = async (args) => makeLogRow({ content: args.data.content as string });
    const l = await VisitorManagementService.createAccessLog('org-1', 'ws-1', {
      type: 'check_in',
    }, 'user-1');
    assert.equal(l.type, 'check_in');
    assert.equal(l.status, 'recorded');
    assert.equal(l.location, '');
  });

  it('creates an access log with full input', async () => {
    memCreateImpl = async (args) => makeLogRow({ content: args.data.content as string });
    const l = await VisitorManagementService.createAccessLog('org-1', 'ws-1', {
      visitId: 'mem-1', badgeId: 'mem-b1', type: 'access_denied',
      description: 'Access denied to server room', status: 'flagged',
      timestamp: '2028-04-01T14:00:00.000Z', location: 'Server Room',
      officer: 'Guard B', outcome: 'denied', notes: 'No authorization',
    }, 'user-1');
    assert.equal(l.type, 'access_denied');
    assert.equal(l.status, 'flagged');
    assert.equal(l.officer, 'Guard B');
    assert.equal(l.outcome, 'denied');
  });

  it('gets an access log by id', async () => {
    memFindUniqueImpl = async () => makeLogRow();
    const l = await VisitorManagementService.getAccessLog('mem-l1');
    assert.ok(l);
    assert.equal(l!.type, 'check_in');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLogRow({ type: 'visitor_visit' });
    const l = await VisitorManagementService.getAccessLog('mem-l1');
    assert.equal(l, null);
  });

  it('returns null when access log not found', async () => {
    memFindUniqueImpl = async () => null;
    const l = await VisitorManagementService.getAccessLog('nope');
    assert.equal(l, null);
  });

  it('lists access logs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_access_log') return [makeLogRow()];
      return [];
    };
    const list = await VisitorManagementService.listAccessLogs('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an access log', async () => {
    memFindUniqueImpl = async () => makeLogRow();
    memUpdateImpl = async (args) => makeLogRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await VisitorManagementService.updateAccessLog('mem-l1', { status: 'reviewed' });
    assert.ok(l);
    assert.equal(l!.status, 'reviewed');
  });

  it('deletes an access log', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await VisitorManagementService.deleteAccessLog('mem-l1');
    assert.equal(ok, true);
  });

  it('reviewLog sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeLogRow();
    memUpdateImpl = async (args) => makeLogRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await VisitorManagementService.reviewLog('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'reviewed');
  });

  it('flagLog sets status to flagged', async () => {
    memFindUniqueImpl = async () => makeLogRow();
    memUpdateImpl = async (args) => makeLogRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await VisitorManagementService.flagLog('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'flagged');
  });

  it('archiveLog sets status to archived', async () => {
    memFindUniqueImpl = async () => makeLogRow();
    memUpdateImpl = async (args) => makeLogRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await VisitorManagementService.archiveLog('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('VisitorManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getVisitorManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_visit') return [
        makeRow({ content: JSON.stringify({ visitorName: 'V1', type: 'business', status: 'pre_registered', description: '', hostId: null, hostName: '', company: '', email: '', phone: '', purpose: '', expectedArrival: null, expectedDeparture: null, actualArrival: null, actualDeparture: null, escortRequired: false, notes: '' }) }),
        makeRow({ id: 'v2', content: JSON.stringify({ visitorName: 'V2', type: 'business', status: 'checked_in', description: '', hostId: null, hostName: '', company: '', email: '', phone: '', purpose: '', expectedArrival: null, expectedDeparture: null, actualArrival: null, actualDeparture: null, escortRequired: false, notes: '' }) }),
      ];
      if (t === 'visitor_badge') return [
        makeBadgeRow({ content: JSON.stringify({ visitId: 'v1', type: 'visitor', status: 'active', description: '', badgeNumber: '', issuedAt: null, returnedAt: null, printedBy: '', accessLevel: '', validAreas: [], expiresAt: null, notes: '' }) }),
      ];
      if (t === 'visitor_host') return [
        makeHostRow({ content: JSON.stringify({ name: 'H1', type: 'employee', status: 'active', description: '', department: '', email: '', phone: '', location: '', notes: '' }) }),
      ];
      if (t === 'visitor_access_log') return [
        makeLogRow({ content: JSON.stringify({ visitId: 'v1', badgeId: null, type: 'check_in', status: 'flagged', description: '', timestamp: null, location: '', officer: '', outcome: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await VisitorManagementService.getVisitorManagementMetrics('org-1');
    assert.equal(m.preRegisteredVisits, 1);
    assert.equal(m.checkedInVisitors, 1);
    assert.equal(m.activeBadges, 1);
    assert.equal(m.activeHosts, 1);
    assert.equal(m.flaggedLogs, 1);
  });

  it('getVisitorManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'visitor_visit') return [makeRow()];
      if (t === 'visitor_badge') return [makeBadgeRow()];
      if (t === 'visitor_host') return [makeHostRow()];
      if (t === 'visitor_access_log') return [makeLogRow()];
      return [];
    };
    const s = await VisitorManagementService.getVisitorManagementStats('org-1');
    assert.equal(s.visitCount, 1);
    assert.equal(s.badgeCount, 1);
    assert.equal(s.hostCount, 1);
    assert.equal(s.logCount, 1);
    assert.equal(s.byVisitType['business'], 1);
    assert.equal(s.byBadgeStatus['issued'], 1);
    assert.equal(s.byHostType['employee'], 1);
    assert.equal(s.byLogStatus['recorded'], 1);
  });
});
