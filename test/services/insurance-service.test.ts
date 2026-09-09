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
    type: 'insurance_policy',
    content: JSON.stringify({
      policyNumber: 'POL-001', type: 'general_liability', provider: 'Acme Insurance',
      broker: '', premium: 5000, deductible: 1000, coverageLimit: 1000000,
      startDate: '2024-01-01', endDate: '2025-01-01', status: 'active',
      beneficiaries: [], renewedBy: '', renewedAt: null,
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['insurance_policy', 'general_liability', 'active']),
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

const { InsuranceService } = await import('@/lib/services/insurance-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('InsuranceService', () => {
  beforeEach(() => { resetMock(); });

  // ── Policies ──

  describe('createPolicy', () => {
    it('creates a policy with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_policy', content: args.data.content as string });
      const p = await InsuranceService.createPolicy('org-1', 'ws-1', {
        policyNumber: 'POL-100', type: 'cyber', provider: 'CyberCo', startDate: '2024-06-01',
      }, 'user-1');
      assert.equal(p.policyNumber, 'POL-100');
      assert.equal(p.type, 'cyber');
      assert.equal(p.provider, 'CyberCo');
      assert.equal(p.premium, 0);
      assert.equal(p.deductible, 0);
      assert.equal(p.coverageLimit, 0);
      assert.equal(p.status, 'active');
      assert.equal(p.beneficiaries.length, 0);
      assert.equal(p.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_policy', content: args.data.content as string });
      const p = await InsuranceService.createPolicy('org-1', 'ws-1', {
        policyNumber: 'POL-200', type: 'property', provider: 'PropCo', broker: 'Bob',
        premium: 12000, deductible: 5000, coverageLimit: 5000000,
        startDate: '2024-01-01', endDate: '2025-01-01', status: 'pending',
        beneficiaries: ['Dept A'],
      }, 'user-1');
      assert.equal(p.broker, 'Bob');
      assert.equal(p.premium, 12000);
      assert.equal(p.deductible, 5000);
      assert.equal(p.coverageLimit, 5000000);
      assert.equal(p.status, 'pending');
      assert.equal(p.beneficiaries.length, 1);
    });
  });

  describe('getPolicy', () => {
    it('returns a policy when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_policy' });
      const p = await InsuranceService.getPolicy('mem-1');
      assert.ok(p);
      assert.equal(p!.id, 'mem-1');
      assert.equal(p!.policyNumber, 'POL-001');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await InsuranceService.getPolicy('nope');
      assert.equal(p, null);
    });
  });

  describe('listPolicies', () => {
    it('lists policies', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'p1' }), makeRow({ id: 'p2' })];
      const list = await InsuranceService.listPolicies('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type, status, and provider', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', content: JSON.stringify({ policyNumber: 'A', type: 'cyber', provider: 'CoA', premium: 0, deductible: 0, coverageLimit: 0, startDate: '', endDate: '', status: 'active', beneficiaries: [], broker: '', renewedBy: '', renewedAt: null }) }),
        makeRow({ id: 'p2', content: JSON.stringify({ policyNumber: 'B', type: 'property', provider: 'CoB', premium: 0, deductible: 0, coverageLimit: 0, startDate: '', endDate: '', status: 'expired', beneficiaries: [], broker: '', renewedBy: '', renewedAt: null }) }),
      ];
      const list = await InsuranceService.listPolicies('org-1', { type: 'cyber', status: 'active', provider: 'CoA' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'cyber');
    });
  });

  describe('updatePolicy', () => {
    it('updates policy fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_policy' });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_policy', content: args.data.content as string });
      const p = await InsuranceService.updatePolicy('mem-1', { premium: 9999, status: 'expired' });
      assert.ok(p);
      assert.equal(p!.premium, 9999);
      assert.equal(p!.status, 'expired');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await InsuranceService.updatePolicy('nope', { premium: 100 });
      assert.equal(p, null);
    });
  });

  describe('deletePolicy', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InsuranceService.deletePolicy('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await InsuranceService.deletePolicy('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('renewPolicy', () => {
    it('renews a policy with new end date and premium', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_policy' });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_policy', content: args.data.content as string });
      const p = await InsuranceService.renewPolicy('mem-1', '2026-01-01', 8000, 'alice');
      assert.ok(p);
      assert.equal(p!.status, 'renewed');
      assert.equal(p!.endDate, '2026-01-01');
      assert.equal(p!.premium, 8000);
      assert.equal(p!.renewedBy, 'alice');
      assert.ok(p!.renewedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const p = await InsuranceService.renewPolicy('nope', '2026-01-01');
      assert.equal(p, null);
    });
  });

  // ── Claims ──

  describe('createClaim', () => {
    it('creates a claim with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.createClaim('org-1', 'ws-1', {
        policyId: 'pol-1', incidentDate: '2024-05-01', description: 'Fire damage', amount: 50000,
      }, 'user-1');
      assert.equal(c.policyId, 'pol-1');
      assert.equal(c.description, 'Fire damage');
      assert.equal(c.amount, 50000);
      assert.equal(c.status, 'filed');
      assert.equal(c.filedBy, 'user-1');
      assert.equal(c.approvedAmount, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.createClaim('org-1', 'ws-1', {
        policyId: 'pol-1', claimNumber: 'CLM-001', incidentDate: '2024-05-01',
        description: 'desc', amount: 10000, status: 'under_review', adjuster: 'adj', notes: 'n',
      }, 'user-1');
      assert.equal(c.claimNumber, 'CLM-001');
      assert.equal(c.status, 'under_review');
      assert.equal(c.adjuster, 'adj');
    });
  });

  describe('getClaim', () => {
    it('returns a claim when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_claim', content: JSON.stringify({ policyId: 'p1', claimNumber: 'C1', incidentDate: '', description: '', amount: 0, status: 'filed', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) });
      const c = await InsuranceService.getClaim('mem-1');
      assert.ok(c);
      assert.equal(c!.policyId, 'p1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await InsuranceService.getClaim('nope');
      assert.equal(c, null);
    });
  });

  describe('listClaims', () => {
    it('lists claims and filters by policyId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'c1', type: 'insurance_claim', content: JSON.stringify({ policyId: 'pol-1', claimNumber: 'A', incidentDate: '', description: '', amount: 0, status: 'filed', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
        makeRow({ id: 'c2', type: 'insurance_claim', content: JSON.stringify({ policyId: 'pol-2', claimNumber: 'B', incidentDate: '', description: '', amount: 0, status: 'settled', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
      ];
      const list = await InsuranceService.listClaims('org-1', { policyId: 'pol-1', status: 'filed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].policyId, 'pol-1');
    });
  });

  describe('updateClaim', () => {
    it('updates claim fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_claim', content: JSON.stringify({ policyId: 'p1', claimNumber: 'C1', incidentDate: '', description: 'old', amount: 0, status: 'filed', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.updateClaim('mem-1', { description: 'new desc', amount: 20000, status: 'under_review' });
      assert.ok(c);
      assert.equal(c!.description, 'new desc');
      assert.equal(c!.amount, 20000);
      assert.equal(c!.status, 'under_review');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await InsuranceService.updateClaim('nope', { amount: 100 });
      assert.equal(c, null);
    });
  });

  describe('approveClaim', () => {
    it('approves a claim', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_claim', content: JSON.stringify({ policyId: 'p1', claimNumber: 'C1', incidentDate: '', description: '', amount: 10000, status: 'under_review', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.approveClaim('mem-1', 8000, 'manager');
      assert.ok(c);
      assert.equal(c!.status, 'approved');
      assert.equal(c!.approvedAmount, 8000);
      assert.equal(c!.approvedBy, 'manager');
      assert.ok(c!.approvedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await InsuranceService.approveClaim('nope', 100, 'u');
      assert.equal(c, null);
    });
  });

  describe('denyClaim', () => {
    it('denies a claim with reason', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_claim', content: JSON.stringify({ policyId: 'p1', claimNumber: 'C1', incidentDate: '', description: '', amount: 10000, status: 'under_review', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.denyClaim('mem-1', 'not covered', 'manager');
      assert.ok(c);
      assert.equal(c!.status, 'denied');
      assert.equal(c!.deniedReason, 'not covered');
      assert.equal(c!.deniedBy, 'manager');
      assert.ok(c!.deniedAt);
    });
  });

  describe('settleClaim', () => {
    it('settles a claim', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_claim', content: JSON.stringify({ policyId: 'p1', claimNumber: 'C1', incidentDate: '', description: '', amount: 10000, status: 'approved', adjuster: '', filedBy: '', notes: '', approvedAmount: 8000, approvedBy: 'm', approvedAt: '2024-01-01', deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_claim', content: args.data.content as string });
      const c = await InsuranceService.settleClaim('mem-1', 7500, 'finance');
      assert.ok(c);
      assert.equal(c!.status, 'settled');
      assert.equal(c!.settlementAmount, 7500);
      assert.equal(c!.settledBy, 'finance');
      assert.ok(c!.settledAt);
    });
  });

  // ── Coverages ──

  describe('createCoverage', () => {
    it('creates a coverage with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_coverage', content: args.data.content as string });
      const c = await InsuranceService.createCoverage('org-1', 'ws-1', {
        policyId: 'pol-1', name: 'General Coverage', coveredPerils: ['fire', 'theft'],
      }, 'user-1');
      assert.equal(c.policyId, 'pol-1');
      assert.equal(c.name, 'General Coverage');
      assert.equal(c.coveredPerils.length, 2);
      assert.equal(c.exclusions.length, 0);
      assert.equal(c.limit, 0);
      assert.equal(c.sublimits.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_coverage', content: args.data.content as string });
      const c = await InsuranceService.createCoverage('org-1', 'ws-1', {
        policyId: 'pol-1', name: 'Full', description: 'desc', coveredPerils: ['fire'],
        exclusions: ['war'], limit: 500000, sublimits: [{ name: 'sub', amount: 50000 }],
      }, 'user-1');
      assert.equal(c.description, 'desc');
      assert.equal(c.exclusions.length, 1);
      assert.equal(c.limit, 500000);
      assert.equal(c.sublimits.length, 1);
    });
  });

  describe('getCoverage', () => {
    it('returns a coverage when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_coverage', content: JSON.stringify({ policyId: 'p1', name: 'Cov', description: '', coveredPerils: [], exclusions: [], limit: 0, sublimits: [] }) });
      const c = await InsuranceService.getCoverage('mem-1');
      assert.ok(c);
      assert.equal(c!.name, 'Cov');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await InsuranceService.getCoverage('nope');
      assert.equal(c, null);
    });
  });

  describe('listCoverages', () => {
    it('lists coverages and filters by policyId', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'cv1', type: 'insurance_coverage', content: JSON.stringify({ policyId: 'pol-1', name: 'A', description: '', coveredPerils: [], exclusions: [], limit: 0, sublimits: [] }) }),
        makeRow({ id: 'cv2', type: 'insurance_coverage', content: JSON.stringify({ policyId: 'pol-2', name: 'B', description: '', coveredPerils: [], exclusions: [], limit: 0, sublimits: [] }) }),
      ];
      const list = await InsuranceService.listCoverages('org-1', { policyId: 'pol-1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].policyId, 'pol-1');
    });
  });

  describe('updateCoverage', () => {
    it('updates coverage fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_coverage', content: JSON.stringify({ policyId: 'p1', name: 'Old', description: '', coveredPerils: [], exclusions: [], limit: 0, sublimits: [] }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_coverage', content: args.data.content as string });
      const c = await InsuranceService.updateCoverage('mem-1', { name: 'New', limit: 200000 });
      assert.ok(c);
      assert.equal(c!.name, 'New');
      assert.equal(c!.limit, 200000);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const c = await InsuranceService.updateCoverage('nope', { name: 'X' });
      assert.equal(c, null);
    });
  });

  describe('deleteCoverage', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InsuranceService.deleteCoverage('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await InsuranceService.deleteCoverage('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Brokers ──

  describe('createBroker', () => {
    it('creates a broker with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_broker', content: args.data.content as string });
      const b = await InsuranceService.createBroker('org-1', 'ws-1', { name: 'Jane Doe' }, 'user-1');
      assert.equal(b.name, 'Jane Doe');
      assert.equal(b.company, '');
      assert.equal(b.email, '');
      assert.equal(b.specialties.length, 0);
      assert.equal(b.commissionRate, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'insurance_broker', content: args.data.content as string });
      const b = await InsuranceService.createBroker('org-1', 'ws-1', {
        name: 'John', company: 'BrokerCo', email: 'j@b.co', phone: '555-0100',
        licenseNumber: 'LIC-123', specialties: ['cyber'], commissionRate: 5,
      }, 'user-1');
      assert.equal(b.company, 'BrokerCo');
      assert.equal(b.email, 'j@b.co');
      assert.equal(b.licenseNumber, 'LIC-123');
      assert.equal(b.specialties.length, 1);
      assert.equal(b.commissionRate, 5);
    });
  });

  describe('getBroker', () => {
    it('returns a broker when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_broker', content: JSON.stringify({ name: 'B', company: '', email: '', phone: '', licenseNumber: '', specialties: [], commissionRate: 0 }) });
      const b = await InsuranceService.getBroker('mem-1');
      assert.ok(b);
      assert.equal(b!.name, 'B');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const b = await InsuranceService.getBroker('nope');
      assert.equal(b, null);
    });
  });

  describe('listBrokers', () => {
    it('lists brokers and filters by company', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'b1', type: 'insurance_broker', content: JSON.stringify({ name: 'A', company: 'CoA', email: '', phone: '', licenseNumber: '', specialties: [], commissionRate: 0 }) }),
        makeRow({ id: 'b2', type: 'insurance_broker', content: JSON.stringify({ name: 'B', company: 'CoB', email: '', phone: '', licenseNumber: '', specialties: [], commissionRate: 0 }) }),
      ];
      const list = await InsuranceService.listBrokers('org-1', { company: 'CoA' });
      assert.equal(list.length, 1);
      assert.equal(list[0].company, 'CoA');
    });
  });

  describe('updateBroker', () => {
    it('updates broker fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'insurance_broker', content: JSON.stringify({ name: 'Old', company: '', email: '', phone: '', licenseNumber: '', specialties: [], commissionRate: 0 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'insurance_broker', content: args.data.content as string });
      const b = await InsuranceService.updateBroker('mem-1', { name: 'New', commissionRate: 10 });
      assert.ok(b);
      assert.equal(b!.name, 'New');
      assert.equal(b!.commissionRate, 10);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const b = await InsuranceService.updateBroker('nope', { name: 'X' });
      assert.equal(b, null);
    });
  });

  describe('deleteBroker', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await InsuranceService.deleteBroker('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Analytics ──

  describe('getExpiringPolicies', () => {
    it('returns active policies expiring within the horizon', async () => {
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const far = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      memFindManyImpl = async () => [
        makeRow({ id: 'p1', type: 'insurance_policy', content: JSON.stringify({ policyNumber: 'A', type: 'general_liability', provider: '', broker: '', premium: 0, deductible: 0, coverageLimit: 0, startDate: '', endDate: soon, status: 'active', beneficiaries: [], renewedBy: '', renewedAt: null }) }),
        makeRow({ id: 'p2', type: 'insurance_policy', content: JSON.stringify({ policyNumber: 'B', type: 'general_liability', provider: '', broker: '', premium: 0, deductible: 0, coverageLimit: 0, startDate: '', endDate: far, status: 'active', beneficiaries: [], renewedBy: '', renewedAt: null }) }),
      ];
      const list = await InsuranceService.getExpiringPolicies('org-1', 90);
      assert.equal(list.length, 1);
      assert.equal(list[0].policyNumber, 'A');
    });
  });

  describe('getInsuranceMetrics', () => {
    it('computes metrics correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'insurance_policy') return [
          makeRow({ id: 'p1', content: JSON.stringify({ policyNumber: 'A', type: 'general_liability', provider: '', broker: '', premium: 5000, deductible: 0, coverageLimit: 1000000, startDate: '', endDate: '', status: 'active', beneficiaries: [], renewedBy: '', renewedAt: null }) }),
        ];
        if (where.type === 'insurance_claim') return [
          makeRow({ id: 'c1', type: 'insurance_claim', content: JSON.stringify({ policyId: '', claimNumber: '', incidentDate: '', description: '', amount: 0, status: 'filed', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
          makeRow({ id: 'c2', type: 'insurance_claim', content: JSON.stringify({ policyId: '', claimNumber: '', incidentDate: '', description: '', amount: 0, status: 'approved', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
          makeRow({ id: 'c3', type: 'insurance_claim', content: JSON.stringify({ policyId: '', claimNumber: '', incidentDate: '', description: '', amount: 0, status: 'denied', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
        ];
        return [];
      };
      const m = await InsuranceService.getInsuranceMetrics('org-1');
      assert.equal(m.totalCoverage, 1000000);
      assert.equal(m.totalPremiums, 5000);
      assert.equal(m.openClaims, 1);
      assert.equal(m.claimSuccessRate, 0.5);
    });
  });

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'insurance_policy') return [
          makeRow({ id: 'p1', content: JSON.stringify({ policyNumber: 'A', type: 'general_liability', provider: '', broker: '', premium: 3000, deductible: 0, coverageLimit: 500000, startDate: '', endDate: '', status: 'active', beneficiaries: [], renewedBy: '', renewedAt: null }) }),
          makeRow({ id: 'p2', content: JSON.stringify({ policyNumber: 'B', type: 'general_liability', provider: '', broker: '', premium: 2000, deductible: 0, coverageLimit: 500000, startDate: '', endDate: '', status: 'expired', beneficiaries: [], renewedBy: '', renewedAt: null }) }),
        ];
        if (where.type === 'insurance_claim') return [
          makeRow({ id: 'c1', type: 'insurance_claim', content: JSON.stringify({ policyId: '', claimNumber: '', incidentDate: '', description: '', amount: 0, status: 'filed', adjuster: '', filedBy: '', notes: '', approvedAmount: 0, approvedBy: '', approvedAt: null, deniedReason: '', deniedBy: '', deniedAt: null, settlementAmount: 0, settledBy: '', settledAt: null }) }),
        ];
        if (where.type === 'insurance_coverage') return [makeRow({ id: 'cv1', type: 'insurance_coverage', content: JSON.stringify({ policyId: '', name: '', description: '', coveredPerils: [], exclusions: [], limit: 0, sublimits: [] }) })];
        if (where.type === 'insurance_broker') return [makeRow({ id: 'b1', type: 'insurance_broker', content: JSON.stringify({ name: '', company: '', email: '', phone: '', licenseNumber: '', specialties: [], commissionRate: 0 }) })];
        return [];
      };
      const stats = await InsuranceService.getStats('org-1');
      assert.equal(stats.policyCount, 2);
      assert.equal(stats.activePolicyCount, 1);
      assert.equal(stats.claimCount, 1);
      assert.equal(stats.openClaimCount, 1);
      assert.equal(stats.coverageCount, 1);
      assert.equal(stats.brokerCount, 1);
      assert.equal(stats.totalCoverage, 1000000);
      assert.equal(stats.totalPremiums, 5000);
    });
  });
});
