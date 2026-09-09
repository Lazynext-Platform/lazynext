import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memFindFirstImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    findFirst: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { QualityManagementService } = await import('@/lib/services/quality-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for building Memory rows
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(id: string, type: string, content: Record<string, unknown>): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('QualityManagementService', () => {
  beforeEach(() => { resetMock(); });

  // ── Standards ──

  describe('createStandard', () => {
    it('creates a quality standard with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'quality_standard');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'ISO Quality Manual');
        assert.equal(content.standard, 'custom');
        assert.equal(content.version, '1.0');
        assert.equal(content.isActive, true);
        return makeRow('s1', 'quality_standard', content);
      };

      const result = await QualityManagementService.createStandard('org-1', 'ws-1', { name: 'ISO Quality Manual' }, 'user-1');
      assert.equal(result.name, 'ISO Quality Manual');
      assert.equal(result.standard, 'custom');
    });

    it('creates a standard with explicit standard type and requirements', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.standard, 'ISO 9001');
        assert.deepEqual(content.requirements, ['req1', 'req2']);
        return makeRow('s2', 'quality_standard', content);
      };

      const result = await QualityManagementService.createStandard('org-1', 'ws-1', {
        name: 'QMS',
        standard: 'ISO 9001',
        requirements: ['req1', 'req2'],
        version: '2.0',
        isActive: false,
      }, 'user-1');
      assert.equal(result.standard, 'ISO 9001');
      assert.equal(result.version, '2.0');
      assert.equal(result.isActive, false);
      assert.equal(result.requirements.length, 2);
    });
  });

  describe('getStandard', () => {
    it('returns a standard by id', async () => {
      memFindUniqueImpl = async () => makeRow('s1', 'quality_standard', { name: 'Std', standard: 'ISO 9001', version: '1.0', isActive: true, requirements: [], description: '' });
      const result = await QualityManagementService.getStandard('s1');
      assert.ok(result);
      assert.equal(result!.name, 'Std');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await QualityManagementService.getStandard('nope');
      assert.equal(result, null);
    });
  });

  describe('listStandards', () => {
    it('lists standards for an organization', async () => {
      memFindManyImpl = async () => [
        makeRow('s1', 'quality_standard', { name: 'A', standard: 'ISO 9001', version: '1.0', isActive: true, requirements: [], description: '' }),
        makeRow('s2', 'quality_standard', { name: 'B', standard: 'Lean', version: '1.0', isActive: false, requirements: [], description: '' }),
      ];
      const result = await QualityManagementService.listStandards('org-1');
      assert.equal(result.length, 2);
    });

    it('applies standard and isActive filters', async () => {
      memFindManyImpl = async () => [
        makeRow('s1', 'quality_standard', { name: 'A', standard: 'ISO 9001', version: '1.0', isActive: true, requirements: [], description: '' }),
        makeRow('s2', 'quality_standard', { name: 'B', standard: 'Lean', version: '1.0', isActive: false, requirements: [], description: '' }),
      ];
      const result = await QualityManagementService.listStandards('org-1', { standard: 'ISO 9001', isActive: true });
      assert.equal(result.length, 1);
      assert.equal(result[0].standard, 'ISO 9001');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await QualityManagementService.listStandards('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateStandard', () => {
    it('updates only provided fields', async () => {
      memFindUniqueImpl = async () => makeRow('s1', 'quality_standard', { name: 'Old', standard: 'custom', version: '1.0', isActive: true, requirements: [], description: '' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New');
        assert.equal(content.version, '1.0');
        return makeRow('s1', 'quality_standard', content);
      };
      const result = await QualityManagementService.updateStandard('s1', { name: 'New' });
      assert.ok(result);
      assert.equal(result!.name, 'New');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await QualityManagementService.updateStandard('nope', { name: 'New' });
      assert.equal(result, null);
    });
  });

  describe('deleteStandard', () => {
    it('deletes a standard', async () => {
      memDeleteImpl = async () => ({ id: 's1' });
      const result = await QualityManagementService.deleteStandard('s1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const result = await QualityManagementService.deleteStandard('s1');
      assert.equal(result, false);
    });
  });

  // ── Inspections ──

  describe('createInspection', () => {
    it('creates an inspection and auto-calculates pass rate', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'quality_inspection');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.passRate, 50);
        assert.equal(content.passedCount, 1);
        assert.equal(content.failedCount, 1);
        assert.equal(content.totalCount, 2);
        return makeRow('i1', 'quality_inspection', content);
      };

      const result = await QualityManagementService.createInspection('org-1', 'ws-1', {
        title: 'Inspection 1',
        inspector: 'Alice',
        date: '2025-01-01',
        items: [
          { name: 'check 1', passed: true },
          { name: 'check 2', passed: false },
        ],
      }, 'user-1');
      assert.equal(result.passRate, 50);
      assert.equal(result.totalCount, 2);
    });

    it('defaults status to scheduled', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'scheduled');
        return makeRow('i1', 'quality_inspection', content);
      };
      const result = await QualityManagementService.createInspection('org-1', 'ws-1', {
        title: 'Inspection',
        inspector: 'Bob',
        date: '2025-01-01',
        items: [],
      }, 'user-1');
      assert.equal(result.status, 'scheduled');
    });
  });

  describe('getInspection', () => {
    it('returns an inspection by id', async () => {
      memFindUniqueImpl = async () => makeRow('i1', 'quality_inspection', { title: 'X', inspector: 'A', date: '2025-01-01', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: null });
      const result = await QualityManagementService.getInspection('i1');
      assert.ok(result);
      assert.equal(result!.title, 'X');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await QualityManagementService.getInspection('nope');
      assert.equal(result, null);
    });
  });

  describe('listInspections', () => {
    it('applies standardId, status, and inspector filters', async () => {
      memFindManyImpl = async () => [
        makeRow('i1', 'quality_inspection', { title: 'A', inspector: 'Alice', date: '2025-01-01', items: [], status: 'completed', passRate: 100, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: 's1' }),
        makeRow('i2', 'quality_inspection', { title: 'B', inspector: 'Bob', date: '2025-01-01', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: 's2' }),
      ];
      const result = await QualityManagementService.listInspections('org-1', { standardId: 's1', status: 'completed', inspector: 'Alice' });
      assert.equal(result.length, 1);
      assert.equal(result[0].inspector, 'Alice');
    });
  });

  describe('updateInspection', () => {
    it('updates items and recalculates pass rate', async () => {
      memFindUniqueImpl = async () => makeRow('i1', 'quality_inspection', { title: 'Old', inspector: 'A', date: '2025-01-01', items: [], status: 'scheduled', passRate: 0, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.passRate, 100);
        assert.equal(content.totalCount, 2);
        return makeRow('i1', 'quality_inspection', content);
      };
      const result = await QualityManagementService.updateInspection('i1', {
        items: [{ name: 'a', passed: true }, { name: 'b', passed: true }],
      });
      assert.ok(result);
      assert.equal(result!.passRate, 100);
    });
  });

  describe('completeInspection', () => {
    it('completes an inspection with results and recalculates', async () => {
      memFindUniqueImpl = async () => makeRow('i1', 'quality_inspection', { title: 'X', inspector: 'A', date: '2025-01-01', items: [], status: 'in_progress', passRate: 0, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'completed');
        assert.equal(content.passRate, 100);
        return makeRow('i1', 'quality_inspection', content);
      };
      const result = await QualityManagementService.completeInspection('i1', {
        items: [{ name: 'a', passed: true }],
      });
      assert.ok(result);
      assert.equal(result!.status, 'completed');
    });

    it('defaults to failed status when pass rate < 100', async () => {
      memFindUniqueImpl = async () => makeRow('i1', 'quality_inspection', { title: 'X', inspector: 'A', date: '2025-01-01', items: [], status: 'in_progress', passRate: 0, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        return makeRow('i1', 'quality_inspection', content);
      };
      const result = await QualityManagementService.completeInspection('i1', {
        items: [{ name: 'a', passed: false }],
      });
      assert.ok(result);
      assert.equal(result!.status, 'failed');
    });
  });

  // ── Nonconformances ──

  describe('createNonconformance', () => {
    it('creates a nonconformance with status open', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'nonconformance');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'open');
        assert.equal(content.severity, 'minor');
        return makeRow('n1', 'nonconformance', content);
      };
      const result = await QualityManagementService.createNonconformance('org-1', 'ws-1', {
        title: 'NC 1',
        detectedBy: 'Alice',
        detectedDate: '2025-01-01',
      }, 'user-1');
      assert.equal(result.status, 'open');
      assert.equal(result.severity, 'minor');
    });
  });

  describe('getNonconformance', () => {
    it('returns a nonconformance by id', async () => {
      memFindUniqueImpl = async () => makeRow('n1', 'nonconformance', { title: 'NC', severity: 'major', status: 'open', detectedBy: 'A', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null });
      const result = await QualityManagementService.getNonconformance('n1');
      assert.ok(result);
      assert.equal(result!.severity, 'major');
    });
  });

  describe('listNonconformances', () => {
    it('applies status and severity filters', async () => {
      memFindManyImpl = async () => [
        makeRow('n1', 'nonconformance', { title: 'A', severity: 'critical', status: 'open', detectedBy: 'A', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null }),
        makeRow('n2', 'nonconformance', { title: 'B', severity: 'minor', status: 'closed', detectedBy: 'A', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null }),
      ];
      const result = await QualityManagementService.listNonconformances('org-1', { status: 'open', severity: 'critical' });
      assert.equal(result.length, 1);
      assert.equal(result[0].severity, 'critical');
    });
  });

  describe('closeNonconformance', () => {
    it('closes a nonconformance with resolution', async () => {
      memFindUniqueImpl = async () => makeRow('n1', 'nonconformance', { title: 'NC', severity: 'major', status: 'open', detectedBy: 'A', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'closed');
        assert.equal(content.resolution, 'Fixed');
        assert.ok(content.closedAt);
        return makeRow('n1', 'nonconformance', content);
      };
      const result = await QualityManagementService.closeNonconformance('n1', 'Fixed');
      assert.ok(result);
      assert.equal(result!.status, 'closed');
      assert.equal(result!.resolution, 'Fixed');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await QualityManagementService.closeNonconformance('nope', 'x');
      assert.equal(result, null);
    });
  });

  // ── CAPAs ──

  describe('createCAPA', () => {
    it('creates a CAPA with the given type', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'capa');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.type, 'corrective');
        assert.equal(content.status, 'open');
        return makeRow('c1', 'capa', content);
      };
      const result = await QualityManagementService.createCAPA('org-1', 'ws-1', {
        title: 'CAPA 1',
        type: 'corrective',
      }, 'user-1');
      assert.equal(result.type, 'corrective');
      assert.equal(result.status, 'open');
    });
  });

  describe('getCAPA', () => {
    it('returns a CAPA by id', async () => {
      memFindUniqueImpl = async () => makeRow('c1', 'capa', { title: 'C', type: 'preventive', status: 'open', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null });
      const result = await QualityManagementService.getCAPA('c1');
      assert.ok(result);
      assert.equal(result!.type, 'preventive');
    });
  });

  describe('listCAPAs', () => {
    it('applies status and type filters', async () => {
      memFindManyImpl = async () => [
        makeRow('c1', 'capa', { title: 'A', type: 'corrective', status: 'open', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null }),
        makeRow('c2', 'capa', { title: 'B', type: 'preventive', status: 'completed', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null }),
      ];
      const result = await QualityManagementService.listCAPAs('org-1', { status: 'open', type: 'corrective' });
      assert.equal(result.length, 1);
    });
  });

  describe('completeCAPA', () => {
    it('completes a CAPA and sets status to pending_verification', async () => {
      memFindUniqueImpl = async () => makeRow('c1', 'capa', { title: 'C', type: 'corrective', status: 'in_progress', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'pending_verification');
        assert.equal(content.results, 'Done');
        assert.ok(content.completedAt);
        return makeRow('c1', 'capa', content);
      };
      const result = await QualityManagementService.completeCAPA('c1', { results: 'Done' });
      assert.ok(result);
      assert.equal(result!.status, 'pending_verification');
    });
  });

  describe('verifyCAPA', () => {
    it('verifies a CAPA with verifier info', async () => {
      memFindUniqueImpl = async () => makeRow('c1', 'capa', { title: 'C', type: 'corrective', status: 'pending_verification', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'verified');
        assert.equal(content.verifiedBy, 'verifier-1');
        assert.ok(content.verifiedAt);
        return makeRow('c1', 'capa', content);
      };
      const result = await QualityManagementService.verifyCAPA('c1', 'verifier-1');
      assert.ok(result);
      assert.equal(result!.status, 'verified');
      assert.equal(result!.verifiedBy, 'verifier-1');
    });
  });

  // ── Audits ──

  describe('createAudit', () => {
    it('creates an audit with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'quality_audit');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'scheduled');
        assert.equal(content.findings.length, 0);
        return makeRow('a1', 'quality_audit', content);
      };
      const result = await QualityManagementService.createAudit('org-1', 'ws-1', {
        title: 'Audit 1',
        auditor: 'Alice',
        date: '2025-01-01',
        scope: 'Full scope',
      }, 'user-1');
      assert.equal(result.status, 'scheduled');
      assert.equal(result.findings.length, 0);
    });
  });

  describe('getAudit', () => {
    it('returns an audit by id', async () => {
      memFindUniqueImpl = async () => makeRow('a1', 'quality_audit', { title: 'A', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'scheduled', findings: [], completedAt: null, standardId: null });
      const result = await QualityManagementService.getAudit('a1');
      assert.ok(result);
      assert.equal(result!.auditor, 'X');
    });
  });

  describe('listAudits', () => {
    it('applies status and standardId filters', async () => {
      memFindManyImpl = async () => [
        makeRow('a1', 'quality_audit', { title: 'A', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'completed', findings: [], completedAt: null, standardId: 's1' }),
        makeRow('a2', 'quality_audit', { title: 'B', auditor: 'Y', date: '2025-01-01', scope: 's', criteria: '', status: 'scheduled', findings: [], completedAt: null, standardId: 's2' }),
      ];
      const result = await QualityManagementService.listAudits('org-1', { status: 'completed', standardId: 's1' });
      assert.equal(result.length, 1);
    });
  });

  describe('completeAudit', () => {
    it('completes an audit with findings', async () => {
      memFindUniqueImpl = async () => makeRow('a1', 'quality_audit', { title: 'A', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'in_progress', findings: [], completedAt: null, standardId: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'completed');
        assert.equal(content.findings.length, 1);
        assert.ok(content.completedAt);
        return makeRow('a1', 'quality_audit', content);
      };
      const result = await QualityManagementService.completeAudit('a1', {
        findings: [{ description: 'Issue found', severity: 'major' }],
      });
      assert.ok(result);
      assert.equal(result!.status, 'completed');
      assert.equal(result!.findings.length, 1);
    });
  });

  // ── Root Cause Analysis ──

  describe('createRootCauseAnalysis', () => {
    it('creates a root cause analysis', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'root_cause_analysis');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.problem, 'Problem X');
        assert.equal(content.rootCause, 'Root Y');
        assert.deepEqual(content.contributingFactors, ['f1']);
        assert.deepEqual(content.recommendations, ['r1']);
        return makeRow('r1', 'root_cause_analysis', content);
      };
      const result = await QualityManagementService.createRootCauseAnalysis('org-1', 'ws-1', {
        problem: 'Problem X',
        rootCause: 'Root Y',
        contributingFactors: ['f1'],
        recommendations: ['r1'],
      }, 'user-1');
      assert.equal(result.problem, 'Problem X');
      assert.equal(result.contributingFactors.length, 1);
    });
  });

  describe('getRootCauseAnalysis', () => {
    it('returns a root cause analysis by id', async () => {
      memFindUniqueImpl = async () => makeRow('r1', 'root_cause_analysis', { problem: 'P', method: '5 Whys', rootCause: 'R', contributingFactors: [], recommendations: [], nonconformanceId: null });
      const result = await QualityManagementService.getRootCauseAnalysis('r1');
      assert.ok(result);
      assert.equal(result!.method, '5 Whys');
    });
  });

  describe('listRootCauseAnalyses', () => {
    it('applies nonconformanceId filter', async () => {
      memFindManyImpl = async () => [
        makeRow('r1', 'root_cause_analysis', { problem: 'P', method: '', rootCause: 'R', contributingFactors: [], recommendations: [], nonconformanceId: 'n1' }),
        makeRow('r2', 'root_cause_analysis', { problem: 'P', method: '', rootCause: 'R', contributingFactors: [], recommendations: [], nonconformanceId: 'n2' }),
      ];
      const result = await QualityManagementService.listRootCauseAnalyses('org-1', { nonconformanceId: 'n1' });
      assert.equal(result.length, 1);
    });
  });

  // ── Metrics & Stats ──

  describe('getQualityMetrics', () => {
    it('computes inspection pass rate, open NCs, open CAPAs, audit completion rate', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = args.where.type as string;
        if (type === 'quality_inspection') {
          return [
            makeRow('i1', 'quality_inspection', { title: 'A', inspector: 'X', date: '2025-01-01', items: [], status: 'completed', passRate: 80, passedCount: 4, failedCount: 1, totalCount: 5, description: '', standardId: null }),
            makeRow('i2', 'quality_inspection', { title: 'B', inspector: 'X', date: '2025-01-01', items: [], status: 'completed', passRate: 100, passedCount: 5, failedCount: 0, totalCount: 5, description: '', standardId: null }),
          ];
        }
        if (type === 'nonconformance') {
          return [
            makeRow('n1', 'nonconformance', { title: 'A', severity: 'critical', status: 'open', detectedBy: 'X', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null }),
            makeRow('n2', 'nonconformance', { title: 'B', severity: 'minor', status: 'closed', detectedBy: 'X', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null }),
          ];
        }
        if (type === 'capa') {
          return [
            makeRow('c1', 'capa', { title: 'A', type: 'corrective', status: 'open', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null }),
          ];
        }
        if (type === 'quality_audit') {
          return [
            makeRow('a1', 'quality_audit', { title: 'A', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'completed', findings: [], completedAt: null, standardId: null }),
            makeRow('a2', 'quality_audit', { title: 'B', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'scheduled', findings: [], completedAt: null, standardId: null }),
          ];
        }
        return [];
      };

      const result = await QualityManagementService.getQualityMetrics('org-1');
      assert.equal(result.totalInspections, 2);
      assert.equal(result.inspectionPassRate, 90);
      assert.equal(result.openNonconformances, 1);
      assert.equal(result.criticalNonconformances, 1);
      assert.equal(result.openCAPAs, 1);
      assert.equal(result.totalAudits, 2);
      assert.equal(result.auditCompletionRate, 50);
    });
  });

  describe('getStats', () => {
    it('returns aggregate stats', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = args.where.type as string;
        if (type === 'quality_standard') {
          return [
            makeRow('s1', 'quality_standard', { name: 'A', standard: 'ISO 9001', version: '1.0', isActive: true, requirements: [], description: '' }),
            makeRow('s2', 'quality_standard', { name: 'B', standard: 'custom', version: '1.0', isActive: false, requirements: [], description: '' }),
          ];
        }
        if (type === 'quality_inspection') {
          return [makeRow('i1', 'quality_inspection', { title: 'A', inspector: 'X', date: '2025-01-01', items: [], status: 'completed', passRate: 100, passedCount: 0, failedCount: 0, totalCount: 0, description: '', standardId: null })];
        }
        if (type === 'nonconformance') {
          return [makeRow('n1', 'nonconformance', { title: 'A', severity: 'minor', status: 'open', detectedBy: 'X', detectedDate: '2025-01-01', category: '', description: '', affectedProduct: '', affectedProcess: '', resolution: null, closedAt: null, inspectionId: null })];
        }
        if (type === 'capa') {
          return [makeRow('c1', 'capa', { title: 'A', type: 'corrective', status: 'open', rootCause: '', correctiveAction: '', preventiveAction: '', assignedTo: '', dueDate: null, completedAt: null, verifiedBy: null, verifiedAt: null, results: null, description: '', nonconformanceId: null })];
        }
        if (type === 'quality_audit') {
          return [makeRow('a1', 'quality_audit', { title: 'A', auditor: 'X', date: '2025-01-01', scope: 's', criteria: '', status: 'completed', findings: [], completedAt: null, standardId: null })];
        }
        if (type === 'root_cause_analysis') {
          return [makeRow('r1', 'root_cause_analysis', { problem: 'P', method: '', rootCause: 'R', contributingFactors: [], recommendations: [], nonconformanceId: null })];
        }
        return [];
      };

      const result = await QualityManagementService.getStats('org-1');
      assert.equal(result.standardCount, 2);
      assert.equal(result.activeStandardCount, 1);
      assert.equal(result.inspectionCount, 1);
      assert.equal(result.completedInspectionCount, 1);
      assert.equal(result.nonconformanceCount, 1);
      assert.equal(result.openNonconformanceCount, 1);
      assert.equal(result.capaCount, 1);
      assert.equal(result.openCAPACount, 1);
      assert.equal(result.auditCount, 1);
      assert.equal(result.completedAuditCount, 1);
      assert.equal(result.rootCauseCount, 1);
    });
  });
});
