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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'reg_filing',
    content: JSON.stringify({ title: 'Test', type: 'report', jurisdiction: 'US', agency: 'FDA', status: 'pending', dueDate: null, submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['reg_filing', 'report', 'pending']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { RegulatoryService } = await import('@/lib/services/regulatory-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('RegulatoryService', () => {
  beforeEach(() => { resetMock(); });

  // ── Filings ──

  describe('createFiling', () => {
    it('creates a filing with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.createFiling('org-1', 'ws-1', { title: 'FDA Registration', type: 'registration', jurisdiction: 'US', agency: 'FDA' }, 'user-1');
      assert.equal(filing.title, 'FDA Registration');
      assert.equal(filing.type, 'registration');
      assert.equal(filing.status, 'pending');
      assert.equal(filing.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.createFiling('org-1', 'ws-1', {
        title: 'License', type: 'license', jurisdiction: 'EU', agency: 'EMA',
        status: 'submitted', dueDate: '2024-12-01', description: 'desc',
        attachments: ['doc.pdf'], requirements: ['req1'], fees: '$500', notes: 'n',
      }, 'user-1');
      assert.equal(filing.status, 'submitted');
      assert.equal(filing.jurisdiction, 'EU');
      assert.equal(filing.agency, 'EMA');
      assert.equal(filing.attachments.length, 1);
      assert.equal(filing.requirements.length, 1);
    });
  });

  describe('getFiling', () => {
    it('returns a filing when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      const filing = await RegulatoryService.getFiling('mem-1');
      assert.ok(filing);
      assert.equal(filing!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const filing = await RegulatoryService.getFiling('nope');
      assert.equal(filing, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_change' });
      const filing = await RegulatoryService.getFiling('mem-1');
      assert.equal(filing, null);
    });
  });

  describe('listFilings', () => {
    it('lists filings and filters by type, status, jurisdiction, agency', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'f1', content: JSON.stringify({ title: 'A', type: 'registration', jurisdiction: 'US', agency: 'FDA', status: 'pending', dueDate: null, submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }) }),
        makeRow({ id: 'f2', content: JSON.stringify({ title: 'B', type: 'license', jurisdiction: 'EU', agency: 'EMA', status: 'accepted', dueDate: null, submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }) }),
      ];
      const list = await RegulatoryService.listFilings('org-1', { type: 'registration', status: 'pending', jurisdiction: 'US', agency: 'FDA' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'registration');
    });
  });

  describe('updateFiling', () => {
    it('updates filing fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.updateFiling('mem-1', { title: 'Updated', status: 'submitted' });
      assert.ok(filing);
      assert.equal(filing!.title, 'Updated');
      assert.equal(filing!.status, 'submitted');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const filing = await RegulatoryService.updateFiling('nope', { title: 'X' });
      assert.equal(filing, null);
    });
  });

  describe('submitFiling', () => {
    it('submits a filing', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.submitFiling('mem-1', 'user-1');
      assert.ok(filing);
      assert.equal(filing!.status, 'submitted');
      assert.equal(filing!.submittedBy, 'user-1');
      assert.ok(filing!.submittedDate);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const filing = await RegulatoryService.submitFiling('nope', 'u');
      assert.equal(filing, null);
    });
  });

  describe('acceptFiling', () => {
    it('accepts a filing', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.acceptFiling('mem-1', 'user-1');
      assert.ok(filing);
      assert.equal(filing!.status, 'accepted');
      assert.equal(filing!.acceptedBy, 'user-1');
      assert.ok(filing!.acceptedDate);
    });

    it('accepts a filing with custom acceptance date', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.acceptFiling('mem-1', 'user-1', '2024-06-01');
      assert.ok(filing);
      assert.equal(filing!.status, 'accepted');
    });
  });

  describe('rejectFiling', () => {
    it('rejects a filing', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_filing', content: args.data.content as string });
      const filing = await RegulatoryService.rejectFiling('mem-1', 'incomplete', 'user-1');
      assert.ok(filing);
      assert.equal(filing!.status, 'rejected');
      assert.equal(filing!.rejectedBy, 'user-1');
      assert.equal(filing!.rejectionReason, 'incomplete');
    });
  });

  // ── Changes ──

  describe('createChange', () => {
    it('creates a change with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_change', content: args.data.content as string });
      const change = await RegulatoryService.createChange('org-1', 'ws-1', { title: 'New GDPR Rule', type: 'new_regulation', jurisdiction: 'EU', agency: 'EC', impactLevel: 'high' }, 'user-1');
      assert.equal(change.title, 'New GDPR Rule');
      assert.equal(change.type, 'new_regulation');
      assert.equal(change.status, 'monitoring');
      assert.equal(change.impactLevel, 'high');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_change', content: args.data.content as string });
      const change = await RegulatoryService.createChange('org-1', 'ws-1', {
        title: 'Amendment', type: 'amendment', jurisdiction: 'US', agency: 'SEC',
        description: 'desc', effectiveDate: '2024-12-01', impactLevel: 'critical',
        impactAreas: ['privacy', 'reporting'], status: 'assessed', source: 'fed', reference: 'ref-1',
      }, 'user-1');
      assert.equal(change.impactLevel, 'critical');
      assert.equal(change.impactAreas.length, 2);
      assert.equal(change.source, 'fed');
      assert.equal(change.reference, 'ref-1');
    });
  });

  describe('getChange', () => {
    it('returns a change when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_change', content: JSON.stringify({ title: 'C', type: 'amendment', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'high', impactAreas: [], status: 'monitoring', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) });
      const change = await RegulatoryService.getChange('mem-1');
      assert.ok(change);
      assert.equal(change!.impactLevel, 'high');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      const change = await RegulatoryService.getChange('mem-1');
      assert.equal(change, null);
    });
  });

  describe('listChanges', () => {
    it('lists changes and filters by type, status, jurisdiction, impactLevel', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'reg_change', content: JSON.stringify({ title: 'A', type: 'new_regulation', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'high', impactAreas: [], status: 'monitoring', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) }),
        makeRow({ id: 'c2', type: 'reg_change', content: JSON.stringify({ title: 'B', type: 'amendment', jurisdiction: 'EU', agency: 'EC', description: '', effectiveDate: null, impactLevel: 'low', impactAreas: [], status: 'implemented', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) }),
      ];
      const list = await RegulatoryService.listChanges('org-1', { type: 'new_regulation', status: 'monitoring', jurisdiction: 'US', impactLevel: 'high' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'new_regulation');
    });
  });

  describe('assessImpact', () => {
    it('assesses a change', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_change', content: JSON.stringify({ title: 'C', type: 'amendment', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'high', impactAreas: [], status: 'monitoring', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_change', content: args.data.content as string });
      const change = await RegulatoryService.assessImpact('mem-1', 'high impact on data', 'user-1');
      assert.ok(change);
      assert.equal(change!.status, 'assessed');
      assert.equal(change!.impactAssessment, 'high impact on data');
      assert.equal(change!.assessedBy, 'user-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const change = await RegulatoryService.assessImpact('nope', 'a', 'u');
      assert.equal(change, null);
    });
  });

  describe('implementChange', () => {
    it('implements a change', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_change', content: JSON.stringify({ title: 'C', type: 'amendment', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'high', impactAreas: [], status: 'assessed', source: '', reference: '', impactAssessment: 'a', assessedBy: 'u', assessedAt: '2024-01-01', implementationPlan: '', implementedBy: null, implementedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_change', content: args.data.content as string });
      const change = await RegulatoryService.implementChange('mem-1', 'update policies', 'user-1');
      assert.ok(change);
      assert.equal(change!.status, 'implemented');
      assert.equal(change!.implementationPlan, 'update policies');
      assert.equal(change!.implementedBy, 'user-1');
    });
  });

  // ── Requirements ──

  describe('createRequirement', () => {
    it('creates a requirement with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_requirement', content: args.data.content as string });
      const req = await RegulatoryService.createRequirement('org-1', 'ws-1', { title: 'GDPR Compliance', jurisdiction: 'EU', agency: 'EC' }, 'user-1');
      assert.equal(req.title, 'GDPR Compliance');
      assert.equal(req.status, 'active');
      assert.equal(req.jurisdiction, 'EU');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_requirement', content: args.data.content as string });
      const req = await RegulatoryService.createRequirement('org-1', 'ws-1', {
        title: 'SOX', description: 'd', jurisdiction: 'US', agency: 'SEC',
        category: 'financial', frequency: 'quarterly', owner: 'alice',
        status: 'compliant', evidence: ['e1'], references: ['r1'],
      }, 'user-1');
      assert.equal(req.category, 'financial');
      assert.equal(req.frequency, 'quarterly');
      assert.equal(req.owner, 'alice');
      assert.equal(req.status, 'compliant');
      assert.equal(req.evidence.length, 1);
    });
  });

  describe('getRequirement', () => {
    it('returns a requirement when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_requirement', content: JSON.stringify({ title: 'R', description: '', jurisdiction: 'US', agency: 'SEC', category: '', frequency: '', owner: '', status: 'active', lastAssessed: null, nextAssessment: null, evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null }) });
      const req = await RegulatoryService.getRequirement('mem-1');
      assert.ok(req);
      assert.equal(req!.title, 'R');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      const req = await RegulatoryService.getRequirement('mem-1');
      assert.equal(req, null);
    });
  });

  describe('listRequirements', () => {
    it('lists requirements and filters by jurisdiction, category, status, owner', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'reg_requirement', content: JSON.stringify({ title: 'A', description: '', jurisdiction: 'US', agency: 'SEC', category: 'financial', frequency: '', owner: 'alice', status: 'active', lastAssessed: null, nextAssessment: null, evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null }) }),
        makeRow({ id: 'r2', type: 'reg_requirement', content: JSON.stringify({ title: 'B', description: '', jurisdiction: 'EU', agency: 'EC', category: 'privacy', frequency: '', owner: 'bob', status: 'non_compliant', lastAssessed: null, nextAssessment: null, evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null }) }),
      ];
      const list = await RegulatoryService.listRequirements('org-1', { jurisdiction: 'US', category: 'financial', status: 'active', owner: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].jurisdiction, 'US');
    });
  });

  describe('updateRequirement', () => {
    it('updates requirement fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_requirement' });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_requirement', content: args.data.content as string });
      const req = await RegulatoryService.updateRequirement('mem-1', { title: 'Updated', status: 'compliant' });
      assert.ok(req);
      assert.equal(req!.title, 'Updated');
      assert.equal(req!.status, 'compliant');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const req = await RegulatoryService.updateRequirement('nope', { title: 'X' });
      assert.equal(req, null);
    });
  });

  describe('deleteRequirement', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await RegulatoryService.deleteRequirement('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await RegulatoryService.deleteRequirement('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('assessRequirement', () => {
    it('assesses a requirement', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_requirement', content: JSON.stringify({ title: 'R', description: '', jurisdiction: 'US', agency: 'SEC', category: '', frequency: '', owner: '', status: 'active', lastAssessed: null, nextAssessment: null, evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_requirement', content: args.data.content as string });
      const req = await RegulatoryService.assessRequirement('mem-1', 'fully compliant', 'user-1');
      assert.ok(req);
      assert.equal(req!.assessment, 'fully compliant');
      assert.equal(req!.assessedBy, 'user-1');
      assert.ok(req!.assessedAt);
      assert.ok(req!.lastAssessed);
    });
  });

  // ── Submissions ──

  describe('createSubmission', () => {
    it('creates a submission with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_submission', content: args.data.content as string });
      const sub = await RegulatoryService.createSubmission('org-1', 'ws-1', { title: 'Q1 Report', type: 'report', recipient: 'SEC' }, 'user-1');
      assert.equal(sub.title, 'Q1 Report');
      assert.equal(sub.status, 'draft');
      assert.equal(sub.recipient, 'SEC');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_submission', content: args.data.content as string });
      const sub = await RegulatoryService.createSubmission('org-1', 'ws-1', {
        filingId: 'f1', title: 'Annual', type: 'report', recipient: 'FDA',
        submittedDate: '2024-06-01', status: 'submitted', content: 'content',
        attachments: ['a.pdf'], response: 'ok', responseDate: '2024-06-10',
      }, 'user-1');
      assert.equal(sub.filingId, 'f1');
      assert.equal(sub.status, 'submitted');
      assert.equal(sub.attachments.length, 1);
    });
  });

  describe('getSubmission', () => {
    it('returns a submission when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_submission', content: JSON.stringify({ filingId: null, title: 'S', type: 'report', recipient: 'FDA', submittedDate: null, status: 'draft', content: '', attachments: [], response: '', responseDate: null, submittedBy: null }) });
      const sub = await RegulatoryService.getSubmission('mem-1');
      assert.ok(sub);
      assert.equal(sub!.title, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      const sub = await RegulatoryService.getSubmission('mem-1');
      assert.equal(sub, null);
    });
  });

  describe('listSubmissions', () => {
    it('lists submissions and filters by filingId, status, type', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'reg_submission', content: JSON.stringify({ filingId: 'f1', title: 'A', type: 'report', recipient: 'FDA', submittedDate: null, status: 'draft', content: '', attachments: [], response: '', responseDate: null, submittedBy: null }) }),
        makeRow({ id: 's2', type: 'reg_submission', content: JSON.stringify({ filingId: 'f2', title: 'B', type: 'notification', recipient: 'EPA', submittedDate: null, status: 'submitted', content: '', attachments: [], response: '', responseDate: null, submittedBy: null }) }),
      ];
      const list = await RegulatoryService.listSubmissions('org-1', { filingId: 'f1', status: 'draft', type: 'report' });
      assert.equal(list.length, 1);
      assert.equal(list[0].filingId, 'f1');
    });
  });

  describe('submitRegulatoryDocument', () => {
    it('submits a document', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_submission', content: JSON.stringify({ filingId: null, title: 'S', type: 'report', recipient: 'FDA', submittedDate: null, status: 'draft', content: '', attachments: [], response: '', responseDate: null, submittedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_submission', content: args.data.content as string });
      const sub = await RegulatoryService.submitRegulatoryDocument('mem-1', 'user-1');
      assert.ok(sub);
      assert.equal(sub!.status, 'submitted');
      assert.equal(sub!.submittedBy, 'user-1');
      assert.ok(sub!.submittedDate);
    });
  });

  describe('logResponse', () => {
    it('logs a response', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_submission', content: JSON.stringify({ filingId: null, title: 'S', type: 'report', recipient: 'FDA', submittedDate: null, status: 'submitted', content: '', attachments: [], response: '', responseDate: null, submittedBy: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_submission', content: args.data.content as string });
      const sub = await RegulatoryService.logResponse('mem-1', 'approved', '2024-06-10');
      assert.ok(sub);
      assert.equal(sub!.status, 'responded');
      assert.equal(sub!.response, 'approved');
    });
  });

  // ── Monitoring ──

  describe('createMonitoring', () => {
    it('creates monitoring with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_monitoring', content: args.data.content as string });
      const mon = await RegulatoryService.createMonitoring('org-1', 'ws-1', { topic: 'GDPR Changes', jurisdiction: 'EU', frequency: 'weekly' }, 'user-1');
      assert.equal(mon.topic, 'GDPR Changes');
      assert.equal(mon.status, 'active');
      assert.equal(mon.frequency, 'weekly');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'reg_monitoring', content: args.data.content as string });
      const mon = await RegulatoryService.createMonitoring('org-1', 'ws-1', {
        topic: 'SEC Rules', jurisdiction: 'US', agency: 'SEC', sources: ['source1'],
        frequency: 'daily', status: 'paused', assignedTo: 'alice',
        findings: [{ date: '2024-01-01', description: 'f', severity: 'high' }],
        alerts: [{ date: '2024-01-01', message: 'm', level: 'warning' }],
      }, 'user-1');
      assert.equal(mon.agency, 'SEC');
      assert.equal(mon.sources.length, 1);
      assert.equal(mon.assignedTo, 'alice');
      assert.equal(mon.findings.length, 1);
      assert.equal(mon.alerts.length, 1);
    });
  });

  describe('getMonitoring', () => {
    it('returns monitoring when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_monitoring', content: JSON.stringify({ topic: 'T', jurisdiction: 'US', agency: '', sources: [], frequency: 'monthly', status: 'active', lastChecked: null, findings: [], assignedTo: '', alerts: [] }) });
      const mon = await RegulatoryService.getMonitoring('mem-1');
      assert.ok(mon);
      assert.equal(mon!.topic, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_filing' });
      const mon = await RegulatoryService.getMonitoring('mem-1');
      assert.equal(mon, null);
    });
  });

  describe('listMonitoring', () => {
    it('lists monitoring and filters by jurisdiction, status, frequency', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', type: 'reg_monitoring', content: JSON.stringify({ topic: 'A', jurisdiction: 'US', agency: '', sources: [], frequency: 'weekly', status: 'active', lastChecked: null, findings: [], assignedTo: '', alerts: [] }) }),
        makeRow({ id: 'm2', type: 'reg_monitoring', content: JSON.stringify({ topic: 'B', jurisdiction: 'EU', agency: '', sources: [], frequency: 'monthly', status: 'paused', lastChecked: null, findings: [], assignedTo: '', alerts: [] }) }),
      ];
      const list = await RegulatoryService.listMonitoring('org-1', { jurisdiction: 'US', status: 'active', frequency: 'weekly' });
      assert.equal(list.length, 1);
      assert.equal(list[0].topic, 'A');
    });
  });

  describe('deleteMonitoring', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await RegulatoryService.deleteMonitoring('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await RegulatoryService.deleteMonitoring('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('recordFinding', () => {
    it('records a finding', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'reg_monitoring', content: JSON.stringify({ topic: 'T', jurisdiction: 'US', agency: '', sources: [], frequency: 'monthly', status: 'active', lastChecked: null, findings: [], assignedTo: '', alerts: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'reg_monitoring', content: args.data.content as string });
      const mon = await RegulatoryService.recordFinding('mem-1', { description: 'new rule', severity: 'high' }, 'user-1');
      assert.ok(mon);
      assert.equal(mon!.findings.length, 1);
      assert.equal(mon!.findings[0].description, 'new rule');
      assert.ok(mon!.lastChecked);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const mon = await RegulatoryService.recordFinding('nope', { description: 'f', severity: 's' }, 'u');
      assert.equal(mon, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getRegulatoryMetrics', () => {
    it('returns metrics with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'reg_filing') return [
          makeRow({ id: 'f1', content: JSON.stringify({ title: 'A', type: 'report', jurisdiction: 'US', agency: 'FDA', status: 'pending', dueDate: '2099-12-01', submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }) }),
        ];
        if (where.type === 'reg_change') return [
          makeRow({ id: 'c1', content: JSON.stringify({ title: 'C', type: 'new_regulation', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'high', impactAreas: [], status: 'monitoring', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) }),
        ];
        if (where.type === 'reg_requirement') return [
          makeRow({ id: 'r1', content: JSON.stringify({ title: 'R', description: '', jurisdiction: 'US', agency: 'SEC', category: '', frequency: '', owner: '', status: 'active', lastAssessed: null, nextAssessment: null, evidence: [], references: [], assessment: '', assessedBy: null, assessedAt: null }) }),
        ];
        return [];
      };
      const metrics = await RegulatoryService.getRegulatoryMetrics('org-1');
      assert.equal(metrics.pendingFilings, 1);
      assert.equal(metrics.highImpactChanges, 1);
      assert.equal(metrics.activeRequirements, 1);
    });
  });

  describe('getStats', () => {
    it('returns stats with correct counts', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as Record<string, unknown>;
        if (where.type === 'reg_filing') return [
          makeRow({ id: 'f1', content: JSON.stringify({ title: 'A', type: 'report', jurisdiction: 'US', agency: 'FDA', status: 'pending', dueDate: null, submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }) }),
          makeRow({ id: 'f2', content: JSON.stringify({ title: 'B', type: 'report', jurisdiction: 'US', agency: 'FDA', status: 'accepted', dueDate: null, submittedDate: null, acceptedDate: null, description: '', attachments: [], requirements: [], fees: '', notes: '', submittedBy: null, acceptedBy: null, rejectedBy: null, rejectionReason: null }) }),
        ];
        if (where.type === 'reg_change') return [
          makeRow({ id: 'c1', content: JSON.stringify({ title: 'C', type: 'new_regulation', jurisdiction: 'US', agency: 'SEC', description: '', effectiveDate: null, impactLevel: 'critical', impactAreas: [], status: 'monitoring', source: '', reference: '', impactAssessment: '', assessedBy: null, assessedAt: null, implementationPlan: '', implementedBy: null, implementedAt: null }) }),
        ];
        return [];
      };
      const stats = await RegulatoryService.getStats('org-1');
      assert.equal(stats.filingCount, 2);
      assert.equal(stats.pendingFilingCount, 1);
      assert.equal(stats.acceptedFilingCount, 1);
      assert.equal(stats.highImpactChangeCount, 1);
    });
  });
});
