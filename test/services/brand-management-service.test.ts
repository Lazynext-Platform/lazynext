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

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'brand_guideline',
    content: JSON.stringify({
      title: 'Brand Visual Guidelines',
      category: 'visual',
      description: 'Core visual identity',
      guidelines: 'Logo usage, colors, typography',
      version: '1.0',
      status: 'draft',
      effectiveDate: '2028-01-01',
      reviewedBy: 'Jane Doe',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['brand_guideline', 'visual', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAssetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'brand_asset',
    content: JSON.stringify({
      name: 'Primary Logo',
      type: 'logo',
      url: 'https://example.com/logo.png',
      description: 'Primary brand logo',
      tags: ['primary', 'logo'],
      status: 'active',
      version: '1.0',
      fileSize: 102400,
      fileType: 'png',
      uploadedBy: 'Jane Doe',
      notes: '',
    }),
    tags: JSON.stringify(['brand_asset', 'logo', 'active']),
    ...overrides,
  });
}

function makeAuditRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-au1',
    type: 'brand_audit',
    content: JSON.stringify({
      title: 'Annual Brand Audit',
      frequency: 'annual',
      description: 'Yearly brand consistency audit',
      scope: 'All marketing channels',
      startDate: '2028-01-01',
      endDate: '2028-03-31',
      status: 'planned',
      leadAuditor: 'Jane Doe',
      findings: '',
      score: 0,
      notes: '',
    }),
    tags: JSON.stringify(['brand_audit', 'annual', 'planned']),
    ...overrides,
  });
}

function makeConsistencyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-c1',
    type: 'brand_consistency',
    content: JSON.stringify({
      auditId: null,
      assetId: null,
      guidelineId: null,
      title: 'Logo color mismatch',
      status: 'minor_issue',
      severity: 'medium',
      description: 'Logo uses incorrect shade of blue',
      recommendation: 'Use approved color palette',
      detectedDate: '2028-02-01',
      detectedBy: 'Jane Doe',
      resolvedDate: null,
      resolvedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['brand_consistency', 'minor_issue', 'medium']),
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
}

const { BrandManagementService } = await import('@/lib/services/brand-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Guidelines
// ─────────────────────────────────────────────────────────────────────────────

describe('BrandManagementService — Guidelines', () => {
  beforeEach(() => resetMock());

  it('creates a guideline with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const g = await BrandManagementService.createGuideline('org-1', 'ws-1', {
      title: 'Color Palette', category: 'color',
    }, 'user-1');
    assert.equal(g.title, 'Color Palette');
    assert.equal(g.status, 'draft');
    assert.equal(g.version, '1.0');
    assert.equal(g.guidelines, '');
  });

  it('creates a guideline with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const g = await BrandManagementService.createGuideline('org-1', 'ws-1', {
      title: 'Voice Guidelines', category: 'voice', description: 'Brand voice rules',
      guidelines: 'Friendly, professional', version: '2.0', status: 'active',
      effectiveDate: '2028-01-01', reviewedBy: 'John', notes: 'Updated',
    }, 'user-1');
    assert.equal(g.title, 'Voice Guidelines');
    assert.equal(g.category, 'voice');
    assert.equal(g.version, '2.0');
    assert.equal(g.status, 'active');
    assert.equal(g.reviewedBy, 'John');
  });

  it('gets a guideline by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const g = await BrandManagementService.getGuideline('mem-1');
    assert.ok(g);
    assert.equal(g!.id, 'mem-1');
    assert.equal(g!.title, 'Brand Visual Guidelines');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'brand_asset' });
    const g = await BrandManagementService.getGuideline('mem-1');
    assert.equal(g, null);
  });

  it('returns null when guideline not found', async () => {
    memFindUniqueImpl = async () => null;
    const g = await BrandManagementService.getGuideline('nope');
    assert.equal(g, null);
  });

  it('lists guidelines by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_guideline') return [makeRow()];
      return [];
    };
    const list = await BrandManagementService.listGuidelines('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Brand Visual Guidelines');
  });

  it('updates a guideline', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const g = await BrandManagementService.updateGuideline('mem-1', { status: 'active' });
    assert.ok(g);
    assert.equal(g!.status, 'active');
  });

  it('deletes a guideline', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await BrandManagementService.deleteGuideline('mem-1');
    assert.equal(ok, true);
  });

  it('activateGuideline sets status to active', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const g = await BrandManagementService.activateGuideline('mem-1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'active');
  });

  it('archiveGuideline sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const g = await BrandManagementService.archiveGuideline('mem-1', 'user-1');
    assert.ok(g);
    assert.equal(g!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assets
// ─────────────────────────────────────────────────────────────────────────────

describe('BrandManagementService — Assets', () => {
  beforeEach(() => resetMock());

  it('creates an asset with defaults', async () => {
    memCreateImpl = async (args) => makeAssetRow({ content: args.data.content as string });
    const a = await BrandManagementService.createAsset('org-1', 'ws-1', {
      name: 'Secondary Logo', type: 'logo',
    }, 'user-1');
    assert.equal(a.name, 'Secondary Logo');
    assert.equal(a.status, 'active');
    assert.equal(a.url, '');
    assert.equal(a.tags.length, 0);
  });

  it('creates an asset with full input', async () => {
    memCreateImpl = async (args) => makeAssetRow({ content: args.data.content as string });
    const a = await BrandManagementService.createAsset('org-1', 'ws-1', {
      name: 'Hero Image', type: 'image', url: 'https://example.com/hero.jpg',
      description: 'Homepage hero', tags: ['hero', 'homepage'], status: 'pending_approval',
      version: '2.0', fileSize: 204800, fileType: 'jpg', uploadedBy: 'Alice', notes: 'Updated',
    }, 'user-1');
    assert.equal(a.name, 'Hero Image');
    assert.equal(a.type, 'image');
    assert.equal(a.url, 'https://example.com/hero.jpg');
    assert.equal(a.status, 'pending_approval');
    assert.equal(a.fileSize, 204800);
  });

  it('gets an asset by id', async () => {
    memFindUniqueImpl = async () => makeAssetRow();
    const a = await BrandManagementService.getAsset('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Primary Logo');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssetRow({ type: 'brand_guideline' });
    const a = await BrandManagementService.getAsset('mem-a1');
    assert.equal(a, null);
  });

  it('lists assets by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_asset') return [makeAssetRow()];
      return [];
    };
    const list = await BrandManagementService.listAssets('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Primary Logo');
  });

  it('updates an asset', async () => {
    memFindUniqueImpl = async () => makeAssetRow();
    memUpdateImpl = async (args) => makeAssetRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await BrandManagementService.updateAsset('mem-a1', { status: 'archived' });
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });

  it('deletes an asset', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await BrandManagementService.deleteAsset('mem-a1');
    assert.equal(ok, true);
  });

  it('deprecateAsset sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeAssetRow();
    memUpdateImpl = async (args) => makeAssetRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await BrandManagementService.deprecateAsset('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'deprecated');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Audits
// ─────────────────────────────────────────────────────────────────────────────

describe('BrandManagementService — Audits', () => {
  beforeEach(() => resetMock());

  it('creates an audit with defaults', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await BrandManagementService.createAudit('org-1', 'ws-1', {
      title: 'Q1 Audit', frequency: 'quarterly',
    }, 'user-1');
    assert.equal(a.title, 'Q1 Audit');
    assert.equal(a.status, 'planned');
    assert.equal(a.score, 0);
    assert.equal(a.scope, '');
  });

  it('creates an audit with full input', async () => {
    memCreateImpl = async (args) => makeAuditRow({ content: args.data.content as string });
    const a = await BrandManagementService.createAudit('org-1', 'ws-1', {
      title: 'Full Audit', frequency: 'semi_annual', description: 'Comprehensive audit',
      scope: 'All channels', startDate: '2028-01-01', endDate: '2028-06-30',
      status: 'in_progress', leadAuditor: 'Bob', findings: 'Some findings',
      score: 85, notes: 'High priority',
    }, 'user-1');
    assert.equal(a.title, 'Full Audit');
    assert.equal(a.frequency, 'semi_annual');
    assert.equal(a.leadAuditor, 'Bob');
    assert.equal(a.score, 85);
    assert.equal(a.status, 'in_progress');
  });

  it('gets an audit by id', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    const a = await BrandManagementService.getAudit('mem-au1');
    assert.ok(a);
    assert.equal(a!.title, 'Annual Brand Audit');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAuditRow({ type: 'brand_guideline' });
    const a = await BrandManagementService.getAudit('mem-au1');
    assert.equal(a, null);
  });

  it('lists audits by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_audit') return [makeAuditRow()];
      return [];
    };
    const list = await BrandManagementService.listAudits('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Annual Brand Audit');
  });

  it('updates an audit', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-au1', content: args.data.content as string });
    const a = await BrandManagementService.updateAudit('mem-au1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an audit', async () => {
    memDeleteImpl = async () => ({ id: 'mem-au1' });
    const ok = await BrandManagementService.deleteAudit('mem-au1');
    assert.equal(ok, true);
  });

  it('startAudit sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-au1', content: args.data.content as string });
    const a = await BrandManagementService.startAudit('mem-au1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeAudit sets status to completed and score', async () => {
    memFindUniqueImpl = async () => makeAuditRow();
    memUpdateImpl = async (args) => makeAuditRow({ id: 'mem-au1', content: args.data.content as string });
    const a = await BrandManagementService.completeAudit('mem-au1', 92, 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
    assert.equal(a!.score, 92);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Consistencies
// ─────────────────────────────────────────────────────────────────────────────

describe('BrandManagementService — Consistencies', () => {
  beforeEach(() => resetMock());

  it('creates a consistency with minimal input', async () => {
    memCreateImpl = async (args) => makeConsistencyRow({ content: args.data.content as string });
    const c = await BrandManagementService.createConsistency('org-1', 'ws-1', {
      title: 'Font mismatch', status: 'minor_issue', severity: 'low',
    }, 'user-1');
    assert.equal(c.title, 'Font mismatch');
    assert.equal(c.status, 'minor_issue');
    assert.equal(c.severity, 'low');
    assert.equal(c.description, '');
  });

  it('creates a consistency with full input', async () => {
    memCreateImpl = async (args) => makeConsistencyRow({ content: args.data.content as string });
    const c = await BrandManagementService.createConsistency('org-1', 'ws-1', {
      title: 'Major logo violation', status: 'major_issue', severity: 'critical',
      auditId: 'mem-au1', assetId: 'mem-a1', guidelineId: 'mem-1',
      description: 'Wrong logo used', recommendation: 'Replace with approved logo',
      detectedDate: '2028-03-01', detectedBy: 'Alice',
      resolvedDate: '2028-04-01', resolvedBy: 'Bob', notes: 'Fixed',
    }, 'user-1');
    assert.equal(c.title, 'Major logo violation');
    assert.equal(c.severity, 'critical');
    assert.equal(c.auditId, 'mem-au1');
    assert.equal(c.assetId, 'mem-a1');
    assert.equal(c.guidelineId, 'mem-1');
    assert.equal(c.detectedBy, 'Alice');
  });

  it('gets a consistency by id', async () => {
    memFindUniqueImpl = async () => makeConsistencyRow();
    const c = await BrandManagementService.getConsistency('mem-c1');
    assert.ok(c);
    assert.equal(c!.title, 'Logo color mismatch');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeConsistencyRow({ type: 'brand_guideline' });
    const c = await BrandManagementService.getConsistency('mem-c1');
    assert.equal(c, null);
  });

  it('lists consistencies by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_consistency') return [makeConsistencyRow()];
      return [];
    };
    const list = await BrandManagementService.listConsistencies('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Logo color mismatch');
  });

  it('updates a consistency', async () => {
    memFindUniqueImpl = async () => makeConsistencyRow();
    memUpdateImpl = async (args) => makeConsistencyRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await BrandManagementService.updateConsistency('mem-c1', { status: 'non_compliant' });
    assert.ok(c);
    assert.equal(c!.status, 'non_compliant');
  });

  it('deletes a consistency', async () => {
    memDeleteImpl = async () => ({ id: 'mem-c1' });
    const ok = await BrandManagementService.deleteConsistency('mem-c1');
    assert.equal(ok, true);
  });

  it('resolveConsistency sets status to compliant', async () => {
    memFindUniqueImpl = async () => makeConsistencyRow();
    memUpdateImpl = async (args) => makeConsistencyRow({ id: 'mem-c1', content: args.data.content as string });
    const c = await BrandManagementService.resolveConsistency('mem-c1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'compliant');
    assert.ok(c!.resolvedDate);
    assert.equal(c!.resolvedBy, 'user-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('BrandManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getBrandManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_guideline') return [
        makeRow({ content: JSON.stringify({ title: 'G1', category: 'visual', status: 'active', version: '1.0', description: '', guidelines: '', reviewedBy: '', notes: '', effectiveDate: null }) }),
        makeRow({ id: 'g2', content: JSON.stringify({ title: 'G2', category: 'voice', status: 'draft', version: '1.0', description: '', guidelines: '', reviewedBy: '', notes: '', effectiveDate: null }) }),
      ];
      if (t === 'brand_asset') return [
        makeAssetRow({ content: JSON.stringify({ name: 'A1', type: 'logo', status: 'active', url: '', description: '', tags: [], version: '1.0', fileSize: 0, fileType: '', uploadedBy: '', notes: '' }) }),
        makeAssetRow({ id: 'a2', content: JSON.stringify({ name: 'A2', type: 'image', status: 'deprecated', url: '', description: '', tags: [], version: '1.0', fileSize: 0, fileType: '', uploadedBy: '', notes: '' }) }),
      ];
      if (t === 'brand_audit') return [
        makeAuditRow({ content: JSON.stringify({ title: 'AU1', frequency: 'annual', status: 'planned', description: '', scope: '', startDate: null, endDate: null, leadAuditor: '', findings: '', score: 0, notes: '' }) }),
        makeAuditRow({ id: 'au2', content: JSON.stringify({ title: 'AU2', frequency: 'quarterly', status: 'completed', description: '', scope: '', startDate: null, endDate: null, leadAuditor: '', findings: '', score: 90, notes: '' }) }),
      ];
      if (t === 'brand_consistency') return [
        makeConsistencyRow({ content: JSON.stringify({ title: 'C1', status: 'minor_issue', severity: 'medium', auditId: null, assetId: null, guidelineId: null, description: '', recommendation: '', detectedDate: null, detectedBy: '', resolvedDate: null, resolvedBy: '', notes: '' }) }),
        makeConsistencyRow({ id: 'c2', content: JSON.stringify({ title: 'C2', status: 'compliant', severity: 'low', auditId: null, assetId: null, guidelineId: null, description: '', recommendation: '', detectedDate: null, detectedBy: '', resolvedDate: null, resolvedBy: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await BrandManagementService.getBrandManagementMetrics('org-1');
    assert.equal(m.activeGuidelines, 1);
    assert.equal(m.activeAssets, 1);
    assert.equal(m.pendingAudits, 1);
    assert.equal(m.complianceIssues, 1);
  });

  it('getBrandManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'brand_guideline') return [makeRow()];
      if (t === 'brand_asset') return [makeAssetRow()];
      if (t === 'brand_audit') return [makeAuditRow()];
      if (t === 'brand_consistency') return [makeConsistencyRow()];
      return [];
    };
    const s = await BrandManagementService.getBrandManagementStats('org-1');
    assert.equal(s.guidelineCount, 1);
    assert.equal(s.assetCount, 1);
    assert.equal(s.auditCount, 1);
    assert.equal(s.consistencyCount, 1);
    assert.equal(s.byGuidelineCategory['visual'], 1);
    assert.equal(s.byGuidelineStatus['draft'], 1);
    assert.equal(s.byAssetType['logo'], 1);
    assert.equal(s.byAssetStatus['active'], 1);
    assert.equal(s.byAuditStatus['planned'], 1);
    assert.equal(s.byConsistencyStatus['minor_issue'], 1);
    assert.equal(s.byConsistencySeverity['medium'], 1);
  });
});
