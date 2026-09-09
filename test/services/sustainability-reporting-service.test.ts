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
    type: 'sustainability_report',
    content: JSON.stringify({
      name: 'Annual Sustainability Report',
      type: 'annual',
      description: 'Annual sustainability report',
      status: 'draft',
      period: '2028',
      framework: 'GRI',
      author: 'Jane Doe',
      publishDate: null,
      audience: 'Stakeholders',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['sustainability_report', 'annual', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeFrameworkRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-fw1',
    type: 'reporting_framework',
    content: JSON.stringify({
      name: 'GRI Standards',
      type: 'gri',
      description: 'Global Reporting Initiative',
      status: 'active',
      version: '2021',
      requirements: 'Core',
      adoptionDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['reporting_framework', 'gri', 'active']),
    ...overrides,
  });
}

function makeDisclosureRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'sustainability_disclosure',
    content: JSON.stringify({
      name: 'Carbon Footprint Disclosure',
      type: 'environmental',
      description: 'Carbon footprint metrics',
      status: 'draft',
      framework: 'GRI',
      metric: 'GHG Emissions',
      value: '10000',
      unit: 'tCO2e',
      period: '2028',
      notes: '',
    }),
    tags: JSON.stringify(['sustainability_disclosure', 'environmental', 'draft']),
    ...overrides,
  });
}

function makeAssuranceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'assurance_engagement',
    content: JSON.stringify({
      name: 'Limited Assurance Engagement',
      type: 'limited',
      description: 'Limited assurance on sustainability report',
      status: 'planned',
      provider: 'Big4 Audit',
      startDate: null,
      endDate: null,
      scope: 'Full report',
      opinion: '',
      notes: '',
    }),
    tags: JSON.stringify(['assurance_engagement', 'limited', 'planned']),
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

const { SustainabilityReportingService } = await import('@/lib/services/sustainability-reporting-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Sustainability Reports
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityReportingService — Sustainability Reports', () => {
  beforeEach(() => resetMock());

  it('creates a sustainability report with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await SustainabilityReportingService.createSustainabilityReport('org-1', 'ws-1', {
      name: 'ESG Report', type: 'esg',
    }, 'user-1');
    assert.equal(r.name, 'ESG Report');
    assert.equal(r.status, 'draft');
    assert.equal(r.author, '');
  });

  it('creates a sustainability report with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const r = await SustainabilityReportingService.createSustainabilityReport('org-1', 'ws-1', {
      name: 'Impact Report', type: 'impact', description: 'Social impact report',
      status: 'in_review', period: '2028', framework: 'SASB',
      author: 'John', publishDate: '2028-06-01', audience: 'Investors',
      notes: 'Annual impact report',
    }, 'user-1');
    assert.equal(r.name, 'Impact Report');
    assert.equal(r.type, 'impact');
    assert.equal(r.framework, 'SASB');
    assert.equal(r.author, 'John');
  });

  it('gets a sustainability report by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const r = await SustainabilityReportingService.getSustainabilityReport('mem-1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-1');
    assert.equal(r!.name, 'Annual Sustainability Report');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'reporting_framework' });
    const r = await SustainabilityReportingService.getSustainabilityReport('mem-1');
    assert.equal(r, null);
  });

  it('returns null when sustainability report not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await SustainabilityReportingService.getSustainabilityReport('nope');
    assert.equal(r, null);
  });

  it('lists sustainability reports by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'sustainability_report') return [makeRow()];
      return [];
    };
    const list = await SustainabilityReportingService.listSustainabilityReports('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Annual Sustainability Report');
  });

  it('updates a sustainability report', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await SustainabilityReportingService.updateSustainabilityReport('mem-1', { status: 'approved' });
    assert.ok(r);
    assert.equal(r!.status, 'approved');
  });

  it('deletes a sustainability report', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await SustainabilityReportingService.deleteSustainabilityReport('mem-1');
    assert.equal(ok, true);
  });

  it('reviewSustainabilityReport sets status to in_review', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await SustainabilityReportingService.reviewSustainabilityReport('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'in_review');
  });

  it('approveSustainabilityReport sets status to approved', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await SustainabilityReportingService.approveSustainabilityReport('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'approved');
  });

  it('publishSustainabilityReport sets status to published', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await SustainabilityReportingService.publishSustainabilityReport('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'published');
  });

  it('archiveSustainabilityReport sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const r = await SustainabilityReportingService.archiveSustainabilityReport('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Reporting Frameworks
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityReportingService — Reporting Frameworks', () => {
  beforeEach(() => resetMock());

  it('creates a reporting framework with defaults', async () => {
    memCreateImpl = async (args) => makeFrameworkRow({ content: args.data.content as string });
    const f = await SustainabilityReportingService.createReportingFramework('org-1', 'ws-1', {
      name: 'SASB Standards', type: 'sasb',
    }, 'user-1');
    assert.equal(f.name, 'SASB Standards');
    assert.equal(f.status, 'active');
    assert.equal(f.version, '');
  });

  it('creates a reporting framework with full input', async () => {
    memCreateImpl = async (args) => makeFrameworkRow({ content: args.data.content as string });
    const f = await SustainabilityReportingService.createReportingFramework('org-1', 'ws-1', {
      name: 'TCFD Framework', type: 'tcfd', description: 'Climate-related financial disclosures',
      status: 'adopted', version: '2021', requirements: 'Core',
      adoptionDate: '2028-01-01', notes: 'Climate risk framework',
    }, 'user-1');
    assert.equal(f.name, 'TCFD Framework');
    assert.equal(f.type, 'tcfd');
    assert.equal(f.version, '2021');
    assert.equal(f.status, 'adopted');
  });

  it('gets a reporting framework by id', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    const f = await SustainabilityReportingService.getReportingFramework('mem-fw1');
    assert.ok(f);
    assert.equal(f!.name, 'GRI Standards');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow({ type: 'sustainability_report' });
    const f = await SustainabilityReportingService.getReportingFramework('mem-fw1');
    assert.equal(f, null);
  });

  it('returns null when reporting framework not found', async () => {
    memFindUniqueImpl = async () => null;
    const f = await SustainabilityReportingService.getReportingFramework('nope');
    assert.equal(f, null);
  });

  it('lists reporting frameworks by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'reporting_framework') return [makeFrameworkRow()];
      return [];
    };
    const list = await SustainabilityReportingService.listReportingFrameworks('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a reporting framework', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    memUpdateImpl = async (args) => makeFrameworkRow({ id: 'mem-fw1', content: args.data.content as string });
    const f = await SustainabilityReportingService.updateReportingFramework('mem-fw1', { status: 'adopted' });
    assert.ok(f);
    assert.equal(f!.status, 'adopted');
  });

  it('deletes a reporting framework', async () => {
    memDeleteImpl = async () => ({ id: 'mem-fw1' });
    const ok = await SustainabilityReportingService.deleteReportingFramework('mem-fw1');
    assert.equal(ok, true);
  });

  it('adoptReportingFramework sets status to adopted', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    memUpdateImpl = async (args) => makeFrameworkRow({ id: 'mem-fw1', content: args.data.content as string });
    const f = await SustainabilityReportingService.adoptReportingFramework('mem-fw1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'adopted');
  });

  it('evaluateReportingFramework sets status to evaluating', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    memUpdateImpl = async (args) => makeFrameworkRow({ id: 'mem-fw1', content: args.data.content as string });
    const f = await SustainabilityReportingService.evaluateReportingFramework('mem-fw1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'evaluating');
  });

  it('deprecateReportingFramework sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    memUpdateImpl = async (args) => makeFrameworkRow({ id: 'mem-fw1', content: args.data.content as string });
    const f = await SustainabilityReportingService.deprecateReportingFramework('mem-fw1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'deprecated');
  });

  it('archiveReportingFramework sets status to archived', async () => {
    memFindUniqueImpl = async () => makeFrameworkRow();
    memUpdateImpl = async (args) => makeFrameworkRow({ id: 'mem-fw1', content: args.data.content as string });
    const f = await SustainabilityReportingService.archiveReportingFramework('mem-fw1', 'user-1');
    assert.ok(f);
    assert.equal(f!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Sustainability Disclosures
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityReportingService — Sustainability Disclosures', () => {
  beforeEach(() => resetMock());

  it('creates a sustainability disclosure with defaults', async () => {
    memCreateImpl = async (args) => makeDisclosureRow({ content: args.data.content as string });
    const d = await SustainabilityReportingService.createSustainabilityDisclosure('org-1', 'ws-1', {
      name: 'Water Usage Disclosure', type: 'environmental',
    }, 'user-1');
    assert.equal(d.name, 'Water Usage Disclosure');
    assert.equal(d.status, 'draft');
    assert.equal(d.value, '');
  });

  it('creates a sustainability disclosure with full input', async () => {
    memCreateImpl = async (args) => makeDisclosureRow({ content: args.data.content as string });
    const d = await SustainabilityReportingService.createSustainabilityDisclosure('org-1', 'ws-1', {
      name: 'Diversity Disclosure', type: 'diversity', description: 'Workforce diversity metrics',
      status: 'submitted', framework: 'GRI', metric: 'Gender Ratio',
      value: '0.45', unit: 'ratio', period: '2028', notes: 'Annual disclosure',
    }, 'user-1');
    assert.equal(d.name, 'Diversity Disclosure');
    assert.equal(d.type, 'diversity');
    assert.equal(d.value, '0.45');
    assert.equal(d.metric, 'Gender Ratio');
  });

  it('gets a sustainability disclosure by id', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    const d = await SustainabilityReportingService.getSustainabilityDisclosure('mem-d1');
    assert.ok(d);
    assert.equal(d!.name, 'Carbon Footprint Disclosure');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow({ type: 'sustainability_report' });
    const d = await SustainabilityReportingService.getSustainabilityDisclosure('mem-d1');
    assert.equal(d, null);
  });

  it('returns null when sustainability disclosure not found', async () => {
    memFindUniqueImpl = async () => null;
    const d = await SustainabilityReportingService.getSustainabilityDisclosure('nope');
    assert.equal(d, null);
  });

  it('lists sustainability disclosures by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'sustainability_disclosure') return [makeDisclosureRow()];
      return [];
    };
    const list = await SustainabilityReportingService.listSustainabilityDisclosures('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a sustainability disclosure', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    memUpdateImpl = async (args) => makeDisclosureRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await SustainabilityReportingService.updateSustainabilityDisclosure('mem-d1', { status: 'verified' });
    assert.ok(d);
    assert.equal(d!.status, 'verified');
  });

  it('deletes a sustainability disclosure', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await SustainabilityReportingService.deleteSustainabilityDisclosure('mem-d1');
    assert.equal(ok, true);
  });

  it('submitSustainabilityDisclosure sets status to submitted', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    memUpdateImpl = async (args) => makeDisclosureRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await SustainabilityReportingService.submitSustainabilityDisclosure('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'submitted');
  });

  it('verifySustainabilityDisclosure sets status to verified', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    memUpdateImpl = async (args) => makeDisclosureRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await SustainabilityReportingService.verifySustainabilityDisclosure('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'verified');
  });

  it('publishSustainabilityDisclosure sets status to published', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    memUpdateImpl = async (args) => makeDisclosureRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await SustainabilityReportingService.publishSustainabilityDisclosure('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'published');
  });

  it('archiveSustainabilityDisclosure sets status to archived', async () => {
    memFindUniqueImpl = async () => makeDisclosureRow();
    memUpdateImpl = async (args) => makeDisclosureRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await SustainabilityReportingService.archiveSustainabilityDisclosure('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assurance Engagements
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityReportingService — Assurance Engagements', () => {
  beforeEach(() => resetMock());

  it('creates an assurance engagement with defaults', async () => {
    memCreateImpl = async (args) => makeAssuranceRow({ content: args.data.content as string });
    const a = await SustainabilityReportingService.createAssuranceEngagement('org-1', 'ws-1', {
      name: 'Reasonable Assurance', type: 'reasonable',
    }, 'user-1');
    assert.equal(a.name, 'Reasonable Assurance');
    assert.equal(a.status, 'planned');
    assert.equal(a.provider, '');
  });

  it('creates an assurance engagement with full input', async () => {
    memCreateImpl = async (args) => makeAssuranceRow({ content: args.data.content as string });
    const a = await SustainabilityReportingService.createAssuranceEngagement('org-1', 'ws-1', {
      name: 'Audit Engagement', type: 'audit', description: 'Full sustainability audit',
      status: 'in_progress', provider: 'Audit Firm', startDate: '2028-01-01',
      endDate: '2028-06-30', scope: 'Full report', opinion: 'Unqualified',
      notes: 'Annual audit',
    }, 'user-1');
    assert.equal(a.name, 'Audit Engagement');
    assert.equal(a.type, 'audit');
    assert.equal(a.provider, 'Audit Firm');
    assert.equal(a.opinion, 'Unqualified');
  });

  it('gets an assurance engagement by id', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    const a = await SustainabilityReportingService.getAssuranceEngagement('mem-a1');
    assert.ok(a);
    assert.equal(a!.name, 'Limited Assurance Engagement');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow({ type: 'sustainability_report' });
    const a = await SustainabilityReportingService.getAssuranceEngagement('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when assurance engagement not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await SustainabilityReportingService.getAssuranceEngagement('nope');
    assert.equal(a, null);
  });

  it('lists assurance engagements by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'assurance_engagement') return [makeAssuranceRow()];
      return [];
    };
    const list = await SustainabilityReportingService.listAssuranceEngagements('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an assurance engagement', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    memUpdateImpl = async (args) => makeAssuranceRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await SustainabilityReportingService.updateAssuranceEngagement('mem-a1', { status: 'in_progress' });
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('deletes an assurance engagement', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await SustainabilityReportingService.deleteAssuranceEngagement('mem-a1');
    assert.equal(ok, true);
  });

  it('startAssuranceEngagement sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    memUpdateImpl = async (args) => makeAssuranceRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await SustainabilityReportingService.startAssuranceEngagement('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeAssuranceEngagement sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    memUpdateImpl = async (args) => makeAssuranceRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await SustainabilityReportingService.completeAssuranceEngagement('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('failAssuranceEngagement sets status to failed', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    memUpdateImpl = async (args) => makeAssuranceRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await SustainabilityReportingService.failAssuranceEngagement('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'failed');
  });

  it('cancelAssuranceEngagement sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeAssuranceRow();
    memUpdateImpl = async (args) => makeAssuranceRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await SustainabilityReportingService.cancelAssuranceEngagement('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('SustainabilityReportingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getSustainabilityReportingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'sustainability_report') return [
        makeRow({ content: JSON.stringify({ name: 'R1', type: 'annual', status: 'published', description: '', period: '', framework: '', author: '', publishDate: null, audience: '', notes: '' }) }),
        makeRow({ id: 'r2', content: JSON.stringify({ name: 'R2', type: 'esg', status: 'draft', description: '', period: '', framework: '', author: '', publishDate: null, audience: '', notes: '' }) }),
      ];
      if (t === 'reporting_framework') return [
        makeFrameworkRow({ content: JSON.stringify({ name: 'F1', type: 'gri', status: 'active', description: '', version: '', requirements: '', adoptionDate: null, notes: '' }) }),
      ];
      if (t === 'sustainability_disclosure') return [
        makeDisclosureRow({ content: JSON.stringify({ name: 'D1', type: 'environmental', status: 'published', description: '', framework: '', metric: '', value: '', unit: '', period: '', notes: '' }) }),
      ];
      if (t === 'assurance_engagement') return [
        makeAssuranceRow({ content: JSON.stringify({ name: 'A1', type: 'limited', status: 'completed', description: '', provider: '', startDate: null, endDate: null, scope: '', opinion: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await SustainabilityReportingService.getSustainabilityReportingMetrics('org-1');
    assert.equal(m.publishedReports, 1);
    assert.equal(m.activeFrameworks, 1);
    assert.equal(m.publishedDisclosures, 1);
    assert.equal(m.completedAssurances, 1);
    assert.equal(m.draftReports, 1);
  });

  it('getSustainabilityReportingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'sustainability_report') return [makeRow()];
      if (t === 'reporting_framework') return [makeFrameworkRow()];
      if (t === 'sustainability_disclosure') return [makeDisclosureRow()];
      if (t === 'assurance_engagement') return [makeAssuranceRow()];
      return [];
    };
    const s = await SustainabilityReportingService.getSustainabilityReportingStats('org-1');
    assert.equal(s.reportCount, 1);
    assert.equal(s.frameworkCount, 1);
    assert.equal(s.disclosureCount, 1);
    assert.equal(s.assuranceCount, 1);
    assert.equal(s.byReportType['annual'], 1);
    assert.equal(s.byFrameworkType['gri'], 1);
    assert.equal(s.byDisclosureType['environmental'], 1);
    assert.equal(s.byAssuranceType['limited'], 1);
  });
});
