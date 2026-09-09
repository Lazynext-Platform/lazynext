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
    type: 'compliance_framework',
    content: JSON.stringify({ name: 'Test', standard: 'SOC2', description: '', version: '1.0', status: 'active', requirements: [] }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['compliance_framework', 'SOC2', 'active']),
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

const { ComplianceAuditService } = await import('@/lib/services/compliance-audit-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComplianceAuditService', () => {
  beforeEach(() => { resetMock(); });

  // ── Frameworks ──

  describe('createFramework', () => {
    it('creates a framework with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'compliance_framework', content: args.data.content as string });
      const fw = await ComplianceAuditService.createFramework('org-1', 'ws-1', { name: 'SOC2 Framework' }, 'user-1');
      assert.equal(fw.name, 'SOC2 Framework');
      assert.equal(fw.standard, 'custom');
      assert.equal(fw.version, '1.0');
      assert.equal(fw.status, 'active');
      assert.equal(fw.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'compliance_framework', content: args.data.content as string });
      const fw = await ComplianceAuditService.createFramework('org-1', 'ws-1', {
        name: 'ISO', standard: 'ISO 27001', description: 'desc', version: '2.0', status: 'inactive',
        requirements: [{ id: 'r1', title: 'R1', description: 'd' }],
      }, 'user-1');
      assert.equal(fw.standard, 'ISO 27001');
      assert.equal(fw.version, '2.0');
      assert.equal(fw.status, 'inactive');
      assert.equal(fw.requirements.length, 1);
    });
  });

  describe('getFramework', () => {
    it('returns a framework when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const fw = await ComplianceAuditService.getFramework('mem-1');
      assert.ok(fw);
      assert.equal(fw!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const fw = await ComplianceAuditService.getFramework('nope');
      assert.equal(fw, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_control' });
      const fw = await ComplianceAuditService.getFramework('mem-1');
      assert.equal(fw, null);
    });
  });

  describe('listFrameworks', () => {
    it('lists frameworks', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'f1' }), makeRow({ id: 'f2' })];
      const list = await ComplianceAuditService.listFrameworks('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by standard and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'f1', content: JSON.stringify({ name: 'A', standard: 'SOC2', description: '', version: '1.0', status: 'active', requirements: [] }) }),
        makeRow({ id: 'f2', content: JSON.stringify({ name: 'B', standard: 'ISO 27001', description: '', version: '1.0', status: 'inactive', requirements: [] }) }),
      ];
      const list = await ComplianceAuditService.listFrameworks('org-1', { standard: 'SOC2', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].standard, 'SOC2');
    });
  });

  describe('updateFramework', () => {
    it('updates framework fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      memUpdateImpl = async (args) => makeRow({ type: 'compliance_framework', content: args.data.content as string });
      const fw = await ComplianceAuditService.updateFramework('mem-1', { name: 'Updated', status: 'archived' });
      assert.ok(fw);
      assert.equal(fw!.name, 'Updated');
      assert.equal(fw!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const fw = await ComplianceAuditService.updateFramework('nope', { name: 'X' });
      assert.equal(fw, null);
    });
  });

  describe('deleteFramework', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await ComplianceAuditService.deleteFramework('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await ComplianceAuditService.deleteFramework('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Controls ──

  describe('createControl', () => {
    it('creates a control with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'compliance_control', content: args.data.content as string });
      const ctrl = await ComplianceAuditService.createControl('org-1', 'ws-1', { frameworkId: 'fw-1', controlId: 'C1', title: 'Access Control' }, 'user-1');
      assert.equal(ctrl.controlId, 'C1');
      assert.equal(ctrl.title, 'Access Control');
      assert.equal(ctrl.frequency, 'annually');
      assert.equal(ctrl.status, 'not_implemented');
      assert.equal(ctrl.frameworkId, 'fw-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'compliance_control', content: args.data.content as string });
      const ctrl = await ComplianceAuditService.createControl('org-1', 'ws-1', {
        frameworkId: 'fw-1', controlId: 'C2', title: 'Encryption', description: 'd', category: 'security', frequency: 'monthly', owner: 'alice', status: 'implemented',
      }, 'user-1');
      assert.equal(ctrl.category, 'security');
      assert.equal(ctrl.frequency, 'monthly');
      assert.equal(ctrl.owner, 'alice');
      assert.equal(ctrl.status, 'implemented');
    });
  });

  describe('getControl', () => {
    it('returns a control when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'T', description: '', category: '', frequency: 'annually', owner: '', status: 'not_implemented' }) });
      const ctrl = await ComplianceAuditService.getControl('mem-1');
      assert.ok(ctrl);
      assert.equal(ctrl!.controlId, 'C1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const ctrl = await ComplianceAuditService.getControl('mem-1');
      assert.equal(ctrl, null);
    });
  });

  describe('listControls', () => {
    it('lists controls and filters by frameworkId, status, category, owner', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'A', description: '', category: 'security', frequency: 'annually', owner: 'alice', status: 'implemented' }) }),
        makeRow({ id: 'c2', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-2', controlId: 'C2', title: 'B', description: '', category: 'ops', frequency: 'annually', owner: 'bob', status: 'gap' }) }),
      ];
      const list = await ComplianceAuditService.listControls('org-1', { frameworkId: 'fw-1', status: 'implemented', category: 'security', owner: 'alice' });
      assert.equal(list.length, 1);
      assert.equal(list[0].controlId, 'C1');
    });
  });

  describe('updateControl', () => {
    it('updates control fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'Old', description: '', category: '', frequency: 'annually', owner: '', status: 'not_implemented' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'compliance_control', content: args.data.content as string });
      const ctrl = await ComplianceAuditService.updateControl('mem-1', { title: 'New', status: 'implemented' });
      assert.ok(ctrl);
      assert.equal(ctrl!.title, 'New');
      assert.equal(ctrl!.status, 'implemented');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const ctrl = await ComplianceAuditService.updateControl('nope', { title: 'X' });
      assert.equal(ctrl, null);
    });
  });

  describe('deleteControl', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await ComplianceAuditService.deleteControl('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Control Tests ──

  describe('createControlTest', () => {
    it('creates a control test with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'control_test', content: args.data.content as string });
      const t = await ComplianceAuditService.createControlTest('org-1', 'ws-1', { controlId: 'c1', testDate: '2024-05-01', tester: 'auditor', result: 'pass' }, 'user-1');
      assert.equal(t.controlId, 'c1');
      assert.equal(t.tester, 'auditor');
      assert.equal(t.result, 'pass');
      assert.equal(t.method, '');
      assert.equal(t.evidenceIds.length, 0);
    });
  });

  describe('getControlTest', () => {
    it('returns a control test when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'control_test', content: JSON.stringify({ controlId: 'c1', testDate: '2024-05-01', tester: 'a', method: '', result: 'pass', notes: '', evidenceIds: [] }) });
      const t = await ComplianceAuditService.getControlTest('mem-1');
      assert.ok(t);
      assert.equal(t!.controlId, 'c1');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const t = await ComplianceAuditService.getControlTest('mem-1');
      assert.equal(t, null);
    });
  });

  describe('listControlTests', () => {
    it('lists control tests and filters by controlId and result', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'control_test', content: JSON.stringify({ controlId: 'c1', testDate: '2024-05-01', tester: 'a', method: '', result: 'pass', notes: '', evidenceIds: [] }) }),
        makeRow({ id: 't2', type: 'control_test', content: JSON.stringify({ controlId: 'c2', testDate: '2024-05-02', tester: 'b', method: '', result: 'fail', notes: '', evidenceIds: [] }) }),
      ];
      const list = await ComplianceAuditService.listControlTests('org-1', { controlId: 'c1', result: 'pass' });
      assert.equal(list.length, 1);
      assert.equal(list[0].controlId, 'c1');
    });
  });

  describe('updateControlTest', () => {
    it('updates control test fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'control_test', content: JSON.stringify({ controlId: 'c1', testDate: '2024-05-01', tester: 'a', method: '', result: 'pass', notes: '', evidenceIds: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'control_test', content: args.data.content as string });
      const t = await ComplianceAuditService.updateControlTest('mem-1', { result: 'fail', notes: 'issue found' });
      assert.ok(t);
      assert.equal(t!.result, 'fail');
      assert.equal(t!.notes, 'issue found');
    });
  });

  // ── Findings ──

  describe('createFinding', () => {
    it('creates a finding with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'audit_finding', content: args.data.content as string });
      const f = await ComplianceAuditService.createFinding('org-1', 'ws-1', { title: 'Gap found' }, 'user-1');
      assert.equal(f.title, 'Gap found');
      assert.equal(f.severity, 'medium');
      assert.equal(f.status, 'open');
      assert.equal(f.controlId, null);
    });
  });

  describe('getFinding', () => {
    it('returns a finding when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_finding', content: JSON.stringify({ controlId: null, testId: null, title: 'F', description: '', severity: 'high', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) });
      const f = await ComplianceAuditService.getFinding('mem-1');
      assert.ok(f);
      assert.equal(f!.severity, 'high');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const f = await ComplianceAuditService.getFinding('mem-1');
      assert.equal(f, null);
    });
  });

  describe('listFindings', () => {
    it('lists findings and filters by status, severity, controlId', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'f1', type: 'audit_finding', content: JSON.stringify({ controlId: 'c1', testId: null, title: 'A', description: '', severity: 'high', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) }),
        makeRow({ id: 'f2', type: 'audit_finding', content: JSON.stringify({ controlId: 'c2', testId: null, title: 'B', description: '', severity: 'low', recommendation: '', status: 'closed', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) }),
      ];
      const list = await ComplianceAuditService.listFindings('org-1', { status: 'open', severity: 'high', controlId: 'c1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].controlId, 'c1');
    });
  });

  describe('updateFinding', () => {
    it('updates finding fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_finding', content: JSON.stringify({ controlId: null, testId: null, title: 'Old', description: '', severity: 'medium', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'audit_finding', content: args.data.content as string });
      const f = await ComplianceAuditService.updateFinding('mem-1', { title: 'New', severity: 'critical', status: 'accepted' });
      assert.ok(f);
      assert.equal(f!.title, 'New');
      assert.equal(f!.severity, 'critical');
      assert.equal(f!.status, 'accepted');
    });
  });

  describe('remediateFinding', () => {
    it('remediates a finding', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_finding', content: JSON.stringify({ controlId: null, testId: null, title: 'F', description: '', severity: 'high', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'audit_finding', content: args.data.content as string });
      const f = await ComplianceAuditService.remediateFinding('mem-1', 'fixed', 'alice');
      assert.ok(f);
      assert.equal(f!.status, 'remediated');
      assert.equal(f!.resolution, 'fixed');
      assert.equal(f!.remediatedBy, 'alice');
      assert.ok(f!.remediatedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const f = await ComplianceAuditService.remediateFinding('nope', 'r', 'u');
      assert.equal(f, null);
    });
  });

  // ── Evidence ──

  describe('createEvidence', () => {
    it('creates evidence with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'evidence', content: args.data.content as string });
      const e = await ComplianceAuditService.createEvidence('org-1', 'ws-1', { name: 'Screenshot', type: 'screenshot', collectedBy: 'bob' }, 'user-1');
      assert.equal(e.name, 'Screenshot');
      assert.equal(e.type, 'screenshot');
      assert.equal(e.collectedBy, 'bob');
      assert.equal(e.fileRef, '');
    });
  });

  describe('getEvidence', () => {
    it('returns evidence when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'evidence', content: JSON.stringify({ controlId: null, testId: null, name: 'E', type: 'log', description: '', fileRef: '', collectedBy: 'a', collectedDate: '2024-05-01' }) });
      const e = await ComplianceAuditService.getEvidence('mem-1');
      assert.ok(e);
      assert.equal(e!.name, 'E');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const e = await ComplianceAuditService.getEvidence('mem-1');
      assert.equal(e, null);
    });
  });

  describe('listEvidence', () => {
    it('lists evidence and filters by controlId, testId, type', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'evidence', content: JSON.stringify({ controlId: 'c1', testId: null, name: 'A', type: 'log', description: '', fileRef: '', collectedBy: 'a', collectedDate: '2024-05-01' }) }),
        makeRow({ id: 'e2', type: 'evidence', content: JSON.stringify({ controlId: 'c2', testId: 't1', name: 'B', type: 'screenshot', description: '', fileRef: '', collectedBy: 'b', collectedDate: '2024-05-02' }) }),
      ];
      const list = await ComplianceAuditService.listEvidence('org-1', { controlId: 'c1', type: 'log' });
      assert.equal(list.length, 1);
      assert.equal(list[0].controlId, 'c1');
    });
  });

  describe('deleteEvidence', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await ComplianceAuditService.deleteEvidence('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await ComplianceAuditService.deleteEvidence('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Audit Reports ──

  describe('createAuditReport', () => {
    it('creates an audit report with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'audit_report', content: args.data.content as string });
      const r = await ComplianceAuditService.createAuditReport('org-1', 'ws-1', { frameworkId: 'fw-1', title: 'Annual Audit', auditor: 'Deloitte', startDate: '2024-01-01', scope: 'All systems' }, 'user-1');
      assert.equal(r.title, 'Annual Audit');
      assert.equal(r.auditor, 'Deloitte');
      assert.equal(r.status, 'draft');
      assert.equal(r.findings.length, 0);
      assert.equal(r.frameworkId, 'fw-1');
    });
  });

  describe('getAuditReport', () => {
    it('returns a report when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-1', title: 'R', auditor: 'a', startDate: '2024-01-01', endDate: null, scope: 's', summary: '', status: 'draft', findings: [], conclusion: '' }) });
      const r = await ComplianceAuditService.getAuditReport('mem-1');
      assert.ok(r);
      assert.equal(r!.title, 'R');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'compliance_framework' });
      const r = await ComplianceAuditService.getAuditReport('mem-1');
      assert.equal(r, null);
    });
  });

  describe('listAuditReports', () => {
    it('lists reports and filters by frameworkId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'r1', type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-1', title: 'A', auditor: 'a', startDate: '2024-01-01', endDate: null, scope: 's', summary: '', status: 'draft', findings: [], conclusion: '' }) }),
        makeRow({ id: 'r2', type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-2', title: 'B', auditor: 'b', startDate: '2024-01-02', endDate: null, scope: 's', summary: '', status: 'finalized', findings: [], conclusion: '' }) }),
      ];
      const list = await ComplianceAuditService.listAuditReports('org-1', { frameworkId: 'fw-1', status: 'draft' });
      assert.equal(list.length, 1);
      assert.equal(list[0].frameworkId, 'fw-1');
    });
  });

  describe('updateAuditReport', () => {
    it('updates report fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-1', title: 'Old', auditor: 'a', startDate: '2024-01-01', endDate: null, scope: 's', summary: '', status: 'draft', findings: [], conclusion: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'audit_report', content: args.data.content as string });
      const r = await ComplianceAuditService.updateAuditReport('mem-1', { title: 'New', status: 'in_review' });
      assert.ok(r);
      assert.equal(r!.title, 'New');
      assert.equal(r!.status, 'in_review');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await ComplianceAuditService.updateAuditReport('nope', { title: 'X' });
      assert.equal(r, null);
    });
  });

  describe('finalizeAuditReport', () => {
    it('finalizes a report with findings and conclusion', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-1', title: 'R', auditor: 'a', startDate: '2024-01-01', endDate: null, scope: 's', summary: '', status: 'in_review', findings: [], conclusion: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'audit_report', content: args.data.content as string });
      const r = await ComplianceAuditService.finalizeAuditReport('mem-1', [{ id: 'f1', title: 'Finding', severity: 'high' }], 'All good');
      assert.ok(r);
      assert.equal(r!.status, 'finalized');
      assert.equal(r!.findings.length, 1);
      assert.equal(r!.conclusion, 'All good');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const r = await ComplianceAuditService.finalizeAuditReport('nope', [], 'x');
      assert.equal(r, null);
    });
  });

  // ── Compliance Score ──

  describe('getComplianceScore', () => {
    it('computes score across controls and tests', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'compliance_control') return [
          makeRow({ id: 'c1', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'A', description: '', category: '', frequency: 'annually', owner: '', status: 'implemented' }) }),
          makeRow({ id: 'c2', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C2', title: 'B', description: '', category: '', frequency: 'annually', owner: '', status: 'gap' }) }),
        ];
        if (where.type === 'control_test') return [
          makeRow({ id: 't1', type: 'control_test', content: JSON.stringify({ controlId: 'c2', testDate: '2024-05-02', tester: 'a', method: '', result: 'pass', notes: '', evidenceIds: [] }) }),
        ];
        if (where.type === 'compliance_framework') return [
          makeRow({ id: 'fw-1', type: 'compliance_framework', content: JSON.stringify({ name: 'FW1', standard: 'SOC2', description: '', version: '1.0', status: 'active', requirements: [] }) }),
        ];
        return [];
      };
      const score = await ComplianceAuditService.getComplianceScore('org-1');
      assert.equal(score.totalControls, 2);
      assert.equal(score.passingControls, 2); // c1 implemented, c2 has passing test
      assert.equal(score.score, 100);
      assert.equal(score.byFramework.length, 1);
      assert.equal(score.byFramework[0].frameworkName, 'FW1');
    });

    it('returns zero score when no controls', async () => {
      memFindManyImpl = async () => [];
      const score = await ComplianceAuditService.getComplianceScore('org-1');
      assert.equal(score.totalControls, 0);
      assert.equal(score.score, 0);
    });
  });

  // ── Gap Analysis ──

  describe('getGapAnalysis', () => {
    it('returns only gap and not_implemented controls', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'A', description: '', category: '', frequency: 'annually', owner: '', status: 'implemented' }) }),
        makeRow({ id: 'c2', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C2', title: 'B', description: '', category: '', frequency: 'annually', owner: '', status: 'gap' }) }),
        makeRow({ id: 'c3', type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C3', title: 'C', description: '', category: '', frequency: 'annually', owner: '', status: 'not_implemented' }) }),
      ];
      const gaps = await ComplianceAuditService.getGapAnalysis('org-1');
      assert.equal(gaps.length, 2);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'compliance_framework') return [makeRow({ type: 'compliance_framework' })];
        if (where.type === 'compliance_control') return [makeRow({ type: 'compliance_control', content: JSON.stringify({ frameworkId: 'fw-1', controlId: 'C1', title: 'A', description: '', category: '', frequency: 'annually', owner: '', status: 'implemented' }) })];
        if (where.type === 'control_test') return [makeRow({ type: 'control_test', content: JSON.stringify({ controlId: 'c1', testDate: '2024-05-01', tester: 'a', method: '', result: 'pass', notes: '', evidenceIds: [] }) })];
        if (where.type === 'audit_finding') return [makeRow({ type: 'audit_finding', content: JSON.stringify({ controlId: null, testId: null, title: 'F', description: '', severity: 'high', recommendation: '', status: 'open', dueDate: null, resolution: '', remediatedBy: '', remediatedAt: null }) })];
        if (where.type === 'evidence') return [makeRow({ type: 'evidence', content: JSON.stringify({ controlId: null, testId: null, name: 'E', type: 'log', description: '', fileRef: '', collectedBy: 'a', collectedDate: '2024-05-01' }) })];
        if (where.type === 'audit_report') return [makeRow({ type: 'audit_report', content: JSON.stringify({ frameworkId: 'fw-1', title: 'R', auditor: 'a', startDate: '2024-01-01', endDate: null, scope: 's', summary: '', status: 'draft', findings: [], conclusion: '' }) })];
        return [];
      };
      const stats = await ComplianceAuditService.getStats('org-1');
      assert.equal(stats.frameworkCount, 1);
      assert.equal(stats.controlCount, 1);
      assert.equal(stats.testCount, 1);
      assert.equal(stats.findingCount, 1);
      assert.equal(stats.openFindingCount, 1);
      assert.equal(stats.evidenceCount, 1);
      assert.equal(stats.auditReportCount, 1);
      assert.equal(stats.byControlStatus['implemented'], 1);
      assert.equal(stats.byFindingSeverity['high'], 1);
    });
  });
});
