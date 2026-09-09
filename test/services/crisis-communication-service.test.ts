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
    type: 'crisis_plan',
    content: JSON.stringify({
      name: 'Data Breach Crisis Plan',
      type: 'data_breach',
      description: 'Response plan for data breaches',
      status: 'draft',
      scenario: 'Customer data breach',
      severity: 'critical',
      spokesperson: 'PR Director',
      audience: 'Customers, Media',
      approvalDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['crisis_plan', 'data_breach', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeMessageRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'crisis_message',
    content: JSON.stringify({
      name: 'Initial Statement',
      type: 'initial_statement',
      description: 'Initial public statement',
      status: 'draft',
      planId: 'mem-1',
      channel: 'Press Release',
      audience: 'Public',
      message: 'We are aware of the incident',
      sentBy: '',
      sentDate: null,
      feedback: '',
      notes: '',
    }),
    tags: JSON.stringify(['crisis_message', 'initial_statement', 'draft']),
    ...overrides,
  });
}

function makeCommunicationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'stakeholder_communication',
    content: JSON.stringify({
      name: 'Employee Notification',
      type: 'employees',
      description: 'Notify employees of crisis',
      status: 'planned',
      stakeholderGroup: 'All Staff',
      contactMethod: 'Email',
      message: 'Please review the attached crisis plan',
      sentBy: '',
      sentDate: null,
      response: '',
      notes: '',
    }),
    tags: JSON.stringify(['stakeholder_communication', 'employees', 'planned']),
    ...overrides,
  });
}

function makeInquiryRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-i1',
    type: 'media_inquiry',
    content: JSON.stringify({
      name: 'Press Inquiry',
      type: 'press',
      description: 'Press inquiry about incident',
      status: 'received',
      outlet: 'Daily News',
      journalist: 'Jane Reporter',
      deadline: '2028-01-01',
      question: 'What happened?',
      response: '',
      responseBy: '',
      responseDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['media_inquiry', 'press', 'received']),
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

const { CrisisCommunicationService } = await import('@/lib/services/crisis-communication-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Crisis Plans
// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisCommunicationService — Crisis Plans', () => {
  beforeEach(() => resetMock());

  it('creates a crisis plan with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CrisisCommunicationService.createCrisisPlan('org-1', 'ws-1', {
      name: 'Product Recall Plan', type: 'product_recall',
    }, 'user-1');
    assert.equal(p.name, 'Product Recall Plan');
    assert.equal(p.status, 'draft');
    assert.equal(p.spokesperson, '');
  });

  it('creates a crisis plan with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const p = await CrisisCommunicationService.createCrisisPlan('org-1', 'ws-1', {
      name: 'Reputational Crisis', type: 'reputational', description: 'Brand reputation crisis',
      status: 'approved', scenario: 'Social media backlash', severity: 'high',
      spokesperson: 'CEO', audience: 'Public, Investors',
      approvalDate: '2028-01-01', notes: 'Review annually',
    }, 'user-1');
    assert.equal(p.name, 'Reputational Crisis');
    assert.equal(p.type, 'reputational');
    assert.equal(p.spokesperson, 'CEO');
    assert.equal(p.severity, 'high');
  });

  it('gets a crisis plan by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const p = await CrisisCommunicationService.getCrisisPlan('mem-1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-1');
    assert.equal(p!.name, 'Data Breach Crisis Plan');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'crisis_message' });
    const p = await CrisisCommunicationService.getCrisisPlan('mem-1');
    assert.equal(p, null);
  });

  it('returns null when crisis plan not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await CrisisCommunicationService.getCrisisPlan('nope');
    assert.equal(p, null);
  });

  it('lists crisis plans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'crisis_plan') return [makeRow()];
      return [];
    };
    const list = await CrisisCommunicationService.listCrisisPlans('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Data Breach Crisis Plan');
  });

  it('updates a crisis plan', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CrisisCommunicationService.updateCrisisPlan('mem-1', { status: 'active' });
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('deletes a crisis plan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CrisisCommunicationService.deleteCrisisPlan('mem-1');
    assert.equal(ok, true);
  });

  it('approveCrisisPlan sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CrisisCommunicationService.approveCrisisPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'approved');
  });

  it('activateCrisisPlan sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CrisisCommunicationService.activateCrisisPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('executeCrisisPlan sets status to executed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CrisisCommunicationService.executeCrisisPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'executed');
  });

  it('archiveCrisisPlan sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const p = await CrisisCommunicationService.archiveCrisisPlan('mem-1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Crisis Messages
// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisCommunicationService — Crisis Messages', () => {
  beforeEach(() => resetMock());

  it('creates a crisis message with defaults', async () => {
    memCreateImpl = async (args) => makeMessageRow({ content: args.data.content as string });
    const m = await CrisisCommunicationService.createCrisisMessage('org-1', 'ws-1', {
      name: 'Update Message', type: 'update',
    }, 'user-1');
    assert.equal(m.name, 'Update Message');
    assert.equal(m.status, 'draft');
    assert.equal(m.channel, '');
  });

  it('creates a crisis message with full input', async () => {
    memCreateImpl = async (args) => makeMessageRow({ content: args.data.content as string });
    const m = await CrisisCommunicationService.createCrisisMessage('org-1', 'ws-1', {
      name: 'Apology Message', type: 'apology', description: 'Formal apology',
      status: 'approved', planId: 'mem-1', channel: 'Social Media',
      audience: 'Customers', message: 'We apologize for the inconvenience',
      sentBy: 'PR Team', sentDate: '2028-02-01', feedback: 'Positive',
      notes: 'Approved by CEO',
    }, 'user-1');
    assert.equal(m.name, 'Apology Message');
    assert.equal(m.type, 'apology');
    assert.equal(m.channel, 'Social Media');
    assert.equal(m.audience, 'Customers');
  });

  it('gets a crisis message by id', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    const m = await CrisisCommunicationService.getCrisisMessage('mem-m1');
    assert.ok(m);
    assert.equal(m!.name, 'Initial Statement');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMessageRow({ type: 'crisis_plan' });
    const m = await CrisisCommunicationService.getCrisisMessage('mem-m1');
    assert.equal(m, null);
  });

  it('returns null when crisis message not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await CrisisCommunicationService.getCrisisMessage('nope');
    assert.equal(m, null);
  });

  it('lists crisis messages by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'crisis_message') return [makeMessageRow()];
      return [];
    };
    const list = await CrisisCommunicationService.listCrisisMessages('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a crisis message', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    memUpdateImpl = async (args) => makeMessageRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CrisisCommunicationService.updateCrisisMessage('mem-m1', { status: 'sent' });
    assert.ok(m);
    assert.equal(m!.status, 'sent');
  });

  it('deletes a crisis message', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await CrisisCommunicationService.deleteCrisisMessage('mem-m1');
    assert.equal(ok, true);
  });

  it('approveCrisisMessage sets status to approved', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    memUpdateImpl = async (args) => makeMessageRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CrisisCommunicationService.approveCrisisMessage('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'approved');
  });

  it('sendCrisisMessage sets status to sent', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    memUpdateImpl = async (args) => makeMessageRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CrisisCommunicationService.sendCrisisMessage('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'sent');
  });

  it('publishCrisisMessage sets status to published', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    memUpdateImpl = async (args) => makeMessageRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CrisisCommunicationService.publishCrisisMessage('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'published');
  });

  it('retractCrisisMessage sets status to retracted', async () => {
    memFindUniqueImpl = async () => makeMessageRow();
    memUpdateImpl = async (args) => makeMessageRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await CrisisCommunicationService.retractCrisisMessage('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'retracted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Stakeholder Communications
// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisCommunicationService — Stakeholder Communications', () => {
  beforeEach(() => resetMock());

  it('creates a stakeholder communication with defaults', async () => {
    memCreateImpl = async (args) => makeCommunicationRow({ content: args.data.content as string });
    const c = await CrisisCommunicationService.createStakeholderCommunication('org-1', 'ws-1', {
      name: 'Investor Update', type: 'investors',
    }, 'user-1');
    assert.equal(c.name, 'Investor Update');
    assert.equal(c.status, 'planned');
    assert.equal(c.stakeholderGroup, '');
  });

  it('creates a stakeholder communication with full input', async () => {
    memCreateImpl = async (args) => makeCommunicationRow({ content: args.data.content as string });
    const c = await CrisisCommunicationService.createStakeholderCommunication('org-1', 'ws-1', {
      name: 'Customer Notification', type: 'customers', description: 'Notify customers',
      status: 'in_progress', stakeholderGroup: 'Premium Customers',
      contactMethod: 'Email + SMS', message: 'Service is being restored',
      sentBy: 'Support Team', sentDate: '2028-03-01', response: 'Acknowledged',
      notes: 'Follow up in 24h',
    }, 'user-1');
    assert.equal(c.name, 'Customer Notification');
    assert.equal(c.type, 'customers');
    assert.equal(c.stakeholderGroup, 'Premium Customers');
    assert.equal(c.contactMethod, 'Email + SMS');
  });

  it('gets a stakeholder communication by id', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    const c = await CrisisCommunicationService.getStakeholderCommunication('mem-c1');
    assert.ok(c);
    assert.equal(c!.name, 'Employee Notification');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow({ type: 'crisis_plan' });
    const c = await CrisisCommunicationService.getStakeholderCommunication('mem-c1');
    assert.equal(c, null);
  });

  it('returns null when stakeholder communication not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await CrisisCommunicationService.getStakeholderCommunication('nope');
    assert.equal(c, null);
  });

  it('lists stakeholder communications by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'stakeholder_communication') return [makeCommunicationRow()];
      return [];
    };
    const list = await CrisisCommunicationService.listStakeholderCommunications('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a stakeholder communication', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    memUpdateImpl = async (args) => makeCommunicationRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CrisisCommunicationService.updateStakeholderCommunication('mem-c1', { status: 'sent' });
    assert.ok(c);
    assert.equal(c!.status, 'sent');
  });

  it('deletes a stakeholder communication', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await CrisisCommunicationService.deleteStakeholderCommunication('mem-c1');
    assert.equal(ok, true);
  });

  it('startStakeholderCommunication sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    memUpdateImpl = async (args) => makeCommunicationRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CrisisCommunicationService.startStakeholderCommunication('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'in_progress');
  });

  it('sendStakeholderCommunication sets status to sent', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    memUpdateImpl = async (args) => makeCommunicationRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CrisisCommunicationService.sendStakeholderCommunication('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'sent');
  });

  it('completeStakeholderCommunication sets status to completed', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    memUpdateImpl = async (args) => makeCommunicationRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CrisisCommunicationService.completeStakeholderCommunication('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'completed');
  });

  it('cancelStakeholderCommunication sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeCommunicationRow();
    memUpdateImpl = async (args) => makeCommunicationRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await CrisisCommunicationService.cancelStakeholderCommunication('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Media Inquiries
// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisCommunicationService — Media Inquiries', () => {
  beforeEach(() => resetMock());

  it('creates a media inquiry with defaults', async () => {
    memCreateImpl = async (args) => makeInquiryRow({ content: args.data.content as string });
    const i = await CrisisCommunicationService.createMediaInquiry('org-1', 'ws-1', {
      name: 'TV Inquiry', type: 'television',
    }, 'user-1');
    assert.equal(i.name, 'TV Inquiry');
    assert.equal(i.status, 'received');
    assert.equal(i.outlet, '');
  });

  it('creates a media inquiry with full input', async () => {
    memCreateImpl = async (args) => makeInquiryRow({ content: args.data.content as string });
    const i = await CrisisCommunicationService.createMediaInquiry('org-1', 'ws-1', {
      name: 'Online Blog Inquiry', type: 'blog', description: 'Tech blog inquiry',
      status: 'responding', outlet: 'TechCrunch', journalist: 'John Writer',
      deadline: '2028-04-01', question: 'Can you comment on the outage?',
      response: 'We are investigating', responseBy: 'PR Team',
      responseDate: '2028-03-15', notes: 'Priority response',
    }, 'user-1');
    assert.equal(i.name, 'Online Blog Inquiry');
    assert.equal(i.type, 'blog');
    assert.equal(i.outlet, 'TechCrunch');
    assert.equal(i.journalist, 'John Writer');
  });

  it('gets a media inquiry by id', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    const i = await CrisisCommunicationService.getMediaInquiry('mem-i1');
    assert.ok(i);
    assert.equal(i!.name, 'Press Inquiry');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeInquiryRow({ type: 'crisis_plan' });
    const i = await CrisisCommunicationService.getMediaInquiry('mem-i1');
    assert.equal(i, null);
  });

  it('returns null when media inquiry not found', async () => {
    memFindUniqueImpl = async () => null;
    const i = await CrisisCommunicationService.getMediaInquiry('nope');
    assert.equal(i, null);
  });

  it('lists media inquiries by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'media_inquiry') return [makeInquiryRow()];
      return [];
    };
    const list = await CrisisCommunicationService.listMediaInquiries('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a media inquiry', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    memUpdateImpl = async (args) => makeInquiryRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await CrisisCommunicationService.updateMediaInquiry('mem-i1', { status: 'responding' });
    assert.ok(i);
    assert.equal(i!.status, 'responding');
  });

  it('deletes a media inquiry', async () => {
    memDeleteImpl = async () => ({ id: 'mem-i1' });
    const ok = await CrisisCommunicationService.deleteMediaInquiry('mem-i1');
    assert.equal(ok, true);
  });

  it('respondMediaInquiry sets status to responding', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    memUpdateImpl = async (args) => makeInquiryRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await CrisisCommunicationService.respondMediaInquiry('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'responding');
  });

  it('declineMediaInquiry sets status to declined', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    memUpdateImpl = async (args) => makeInquiryRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await CrisisCommunicationService.declineMediaInquiry('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'declined');
  });

  it('escalateMediaInquiry sets status to escalated', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    memUpdateImpl = async (args) => makeInquiryRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await CrisisCommunicationService.escalateMediaInquiry('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'escalated');
  });

  it('completeMediaInquiry sets status to responded', async () => {
    memFindUniqueImpl = async () => makeInquiryRow();
    memUpdateImpl = async (args) => makeInquiryRow({ id: 'mem-i1', content: args.data.content as string });
    const i = await CrisisCommunicationService.completeMediaInquiry('mem-i1', 'user-1');
    assert.ok(i);
    assert.equal(i!.status, 'responded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CrisisCommunicationService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCrisisCommunicationMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'crisis_plan') return [
        makeRow({ content: JSON.stringify({ name: 'P1', type: 'data_breach', status: 'active', description: '', scenario: '', severity: '', spokesperson: '', audience: '', approvalDate: null, notes: '' }) }),
      ];
      if (t === 'crisis_message') return [
        makeMessageRow({ content: JSON.stringify({ name: 'M1', type: 'initial_statement', status: 'sent', description: '', planId: null, channel: '', audience: '', message: '', sentBy: '', sentDate: null, feedback: '', notes: '' }) }),
        makeMessageRow({ id: 'm2', content: JSON.stringify({ name: 'M2', type: 'update', status: 'published', description: '', planId: null, channel: '', audience: '', message: '', sentBy: '', sentDate: null, feedback: '', notes: '' }) }),
      ];
      if (t === 'stakeholder_communication') return [
        makeCommunicationRow({ content: JSON.stringify({ name: 'C1', type: 'employees', status: 'in_progress', description: '', stakeholderGroup: '', contactMethod: '', message: '', sentBy: '', sentDate: null, response: '', notes: '' }) }),
      ];
      if (t === 'media_inquiry') return [
        makeInquiryRow({ content: JSON.stringify({ name: 'I1', type: 'press', status: 'received', description: '', outlet: '', journalist: '', deadline: null, question: '', response: '', responseBy: '', responseDate: null, notes: '' }) }),
        makeInquiryRow({ id: 'i2', content: JSON.stringify({ name: 'I2', type: 'press', status: 'responding', description: '', outlet: '', journalist: '', deadline: null, question: '', response: '', responseBy: '', responseDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await CrisisCommunicationService.getCrisisCommunicationMetrics('org-1');
    assert.equal(m.activePlans, 1);
    assert.equal(m.sentMessages, 1);
    assert.equal(m.activeCommunications, 1);
    assert.equal(m.pendingInquiries, 2);
    assert.equal(m.publishedMessages, 1);
  });

  it('getCrisisCommunicationStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'crisis_plan') return [makeRow()];
      if (t === 'crisis_message') return [makeMessageRow()];
      if (t === 'stakeholder_communication') return [makeCommunicationRow()];
      if (t === 'media_inquiry') return [makeInquiryRow()];
      return [];
    };
    const s = await CrisisCommunicationService.getCrisisCommunicationStats('org-1');
    assert.equal(s.planCount, 1);
    assert.equal(s.messageCount, 1);
    assert.equal(s.communicationCount, 1);
    assert.equal(s.inquiryCount, 1);
    assert.equal(s.byPlanType['data_breach'], 1);
    assert.equal(s.byMessageType['initial_statement'], 1);
    assert.equal(s.byCommunicationType['employees'], 1);
    assert.equal(s.byInquiryType['press'], 1);
  });
});
