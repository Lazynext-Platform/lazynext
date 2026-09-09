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
    type: 'hazard',
    content: JSON.stringify({
      name: 'Chemical Hazard',
      type: 'chemical',
      description: 'Solvent storage hazard',
      status: 'identified',
      location: 'Storage Room A',
      source: 'Cleaning solvents',
      severity: 'moderate',
      likelihood: 'possible',
      riskLevel: 'medium',
      identifiedBy: 'Safety Officer',
      identifiedDate: '2028-01-01',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['hazard', 'chemical', 'identified']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAssessmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-ra1',
    type: 'risk_assessment',
    content: JSON.stringify({
      name: 'Chemical Risk Assessment',
      type: 'qualitative',
      description: 'Qualitative risk assessment',
      status: 'draft',
      hazardId: 'mem-1',
      assessor: 'Risk Analyst',
      assessmentDate: null,
      methodology: 'Qualitative matrix',
      likelihood: 'possible',
      severity: 'moderate',
      riskScore: 12,
      riskLevel: 'medium',
      notes: '',
    }),
    tags: JSON.stringify(['risk_assessment', 'qualitative', 'draft']),
    ...overrides,
  });
}

function makeControlRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-cm1',
    type: 'control_measure',
    content: JSON.stringify({
      name: 'Ventilation System',
      type: 'engineering',
      description: 'Install ventilation',
      status: 'planned',
      hazardId: 'mem-1',
      effectiveness: 'high',
      implementationDate: null,
      verifiedBy: '',
      cost: 15000,
      notes: '',
    }),
    tags: JSON.stringify(['control_measure', 'engineering', 'planned']),
    ...overrides,
  });
}

function makeJSARow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-jsa1',
    type: 'job_safety_analysis',
    content: JSON.stringify({
      name: 'Chemical Handling JSA',
      type: 'routine',
      description: 'JSA for chemical handling',
      status: 'draft',
      jobTitle: 'Chemical Handler',
      department: 'Operations',
      supervisor: 'Ops Manager',
      steps: '1. Wear PPE 2. Open container 3. Transfer chemical',
      hazards: 'Chemical exposure, spill',
      controls: 'PPE, ventilation, spill kit',
      reviewDate: null,
      approvedBy: '',
      notes: '',
    }),
    tags: JSON.stringify(['job_safety_analysis', 'routine', 'draft']),
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

const { HazardManagementService } = await import('@/lib/services/hazard-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Hazards
// ─────────────────────────────────────────────────────────────────────────────

describe('HazardManagementService — Hazards', () => {
  beforeEach(() => resetMock());

  it('creates a hazard with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const h = await HazardManagementService.createHazard('org-1', 'ws-1', {
      name: 'Electrical Hazard', type: 'electrical',
    }, 'user-1');
    assert.equal(h.name, 'Electrical Hazard');
    assert.equal(h.status, 'identified');
    assert.equal(h.location, '');
  });

  it('creates a hazard with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const h = await HazardManagementService.createHazard('org-1', 'ws-1', {
      name: 'Fire Hazard', type: 'fire', description: 'Combustible materials',
      status: 'assessed', location: 'Warehouse', source: 'Stored materials',
      severity: 'high', likelihood: 'likely', riskLevel: 'high',
      identifiedBy: 'Fire Marshal', identifiedDate: '2028-02-01', notes: 'Urgent',
    }, 'user-1');
    assert.equal(h.name, 'Fire Hazard');
    assert.equal(h.type, 'fire');
    assert.equal(h.riskLevel, 'high');
    assert.equal(h.identifiedBy, 'Fire Marshal');
  });

  it('gets a hazard by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const h = await HazardManagementService.getHazard('mem-1');
    assert.ok(h);
    assert.equal(h!.id, 'mem-1');
    assert.equal(h!.name, 'Chemical Hazard');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'risk_assessment' });
    const h = await HazardManagementService.getHazard('mem-1');
    assert.equal(h, null);
  });

  it('returns null when hazard not found', async () => {
    memFindUniqueImpl = async () => null;
    const h = await HazardManagementService.getHazard('nope');
    assert.equal(h, null);
  });

  it('lists hazards by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'hazard') return [makeRow()];
      return [];
    };
    const list = await HazardManagementService.listHazards('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Chemical Hazard');
  });

  it('updates a hazard', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.updateHazard('mem-1', { status: 'controlled' });
    assert.ok(h);
    assert.equal(h!.status, 'controlled');
  });

  it('deletes a hazard', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await HazardManagementService.deleteHazard('mem-1');
    assert.equal(ok, true);
  });

  it('assessHazard sets status to assessed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.assessHazard('mem-1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'assessed');
  });

  it('controlHazard sets status to controlled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.controlHazard('mem-1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'controlled');
  });

  it('mitigateHazard sets status to mitigated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.mitigateHazard('mem-1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'mitigated');
  });

  it('eliminateHazard sets status to eliminated', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.eliminateHazard('mem-1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'eliminated');
  });

  it('archiveHazard sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const h = await HazardManagementService.archiveHazard('mem-1', 'user-1');
    assert.ok(h);
    assert.equal(h!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Risk Assessments
// ─────────────────────────────────────────────────────────────────────────────

describe('HazardManagementService — Risk Assessments', () => {
  beforeEach(() => resetMock());

  it('creates a risk assessment with defaults', async () => {
    memCreateImpl = async (args) => makeAssessmentRow({ content: args.data.content as string });
    const a = await HazardManagementService.createRiskAssessment('org-1', 'ws-1', {
      name: 'Matrix Assessment', type: 'matrix',
    }, 'user-1');
    assert.equal(a.name, 'Matrix Assessment');
    assert.equal(a.status, 'draft');
    assert.equal(a.riskScore, 0);
  });

  it('creates a risk assessment with full input', async () => {
    memCreateImpl = async (args) => makeAssessmentRow({ content: args.data.content as string });
    const a = await HazardManagementService.createRiskAssessment('org-1', 'ws-1', {
      name: 'HAZOP Assessment', type: 'hazard_operability', description: 'HAZOP study',
      status: 'completed', hazardId: 'mem-1', assessor: 'Engineering Team',
      assessmentDate: '2028-03-01', methodology: 'HAZOP', likelihood: 'rare',
      severity: 'catastrophic', riskScore: 25, riskLevel: 'high', notes: 'Reviewed',
    }, 'user-1');
    assert.equal(a.name, 'HAZOP Assessment');
    assert.equal(a.type, 'hazard_operability');
    assert.equal(a.riskScore, 25);
    assert.equal(a.methodology, 'HAZOP');
  });

  it('gets a risk assessment by id', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    const a = await HazardManagementService.getRiskAssessment('mem-ra1');
    assert.ok(a);
    assert.equal(a!.name, 'Chemical Risk Assessment');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow({ type: 'hazard' });
    const a = await HazardManagementService.getRiskAssessment('mem-ra1');
    assert.equal(a, null);
  });

  it('returns null when risk assessment not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await HazardManagementService.getRiskAssessment('nope');
    assert.equal(a, null);
  });

  it('lists risk assessments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'risk_assessment') return [makeAssessmentRow()];
      return [];
    };
    const list = await HazardManagementService.listRiskAssessments('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a risk assessment', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    memUpdateImpl = async (args) => makeAssessmentRow({ id: 'mem-ra1', content: args.data.content as string });
    const a = await HazardManagementService.updateRiskAssessment('mem-ra1', { status: 'completed' });
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('deletes a risk assessment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-ra1' });
    const ok = await HazardManagementService.deleteRiskAssessment('mem-ra1');
    assert.equal(ok, true);
  });

  it('startRiskAssessment sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    memUpdateImpl = async (args) => makeAssessmentRow({ id: 'mem-ra1', content: args.data.content as string });
    const a = await HazardManagementService.startRiskAssessment('mem-ra1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'in_progress');
  });

  it('completeRiskAssessment sets status to completed', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    memUpdateImpl = async (args) => makeAssessmentRow({ id: 'mem-ra1', content: args.data.content as string });
    const a = await HazardManagementService.completeRiskAssessment('mem-ra1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'completed');
  });

  it('reviewRiskAssessment sets status to reviewed', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    memUpdateImpl = async (args) => makeAssessmentRow({ id: 'mem-ra1', content: args.data.content as string });
    const a = await HazardManagementService.reviewRiskAssessment('mem-ra1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'reviewed');
  });

  it('archiveRiskAssessment sets status to archived', async () => {
    memFindUniqueImpl = async () => makeAssessmentRow();
    memUpdateImpl = async (args) => makeAssessmentRow({ id: 'mem-ra1', content: args.data.content as string });
    const a = await HazardManagementService.archiveRiskAssessment('mem-ra1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Control Measures
// ─────────────────────────────────────────────────────────────────────────────

describe('HazardManagementService — Control Measures', () => {
  beforeEach(() => resetMock());

  it('creates a control measure with defaults', async () => {
    memCreateImpl = async (args) => makeControlRow({ content: args.data.content as string });
    const c = await HazardManagementService.createControlMeasure('org-1', 'ws-1', {
      name: 'PPE Requirement', type: 'ppe',
    }, 'user-1');
    assert.equal(c.name, 'PPE Requirement');
    assert.equal(c.status, 'planned');
    assert.equal(c.cost, 0);
  });

  it('creates a control measure with full input', async () => {
    memCreateImpl = async (args) => makeControlRow({ content: args.data.content as string });
    const c = await HazardManagementService.createControlMeasure('org-1', 'ws-1', {
      name: 'Safety Training', type: 'training', description: 'Mandatory safety training',
      status: 'implemented', hazardId: 'mem-1', effectiveness: 'very high',
      implementationDate: '2028-04-01', verifiedBy: 'Safety Manager',
      cost: 8000, notes: 'Quarterly refresher',
    }, 'user-1');
    assert.equal(c.name, 'Safety Training');
    assert.equal(c.type, 'training');
    assert.equal(c.effectiveness, 'very high');
    assert.equal(c.cost, 8000);
  });

  it('gets a control measure by id', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    const c = await HazardManagementService.getControlMeasure('mem-cm1');
    assert.ok(c);
    assert.equal(c!.name, 'Ventilation System');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeControlRow({ type: 'hazard' });
    const c = await HazardManagementService.getControlMeasure('mem-cm1');
    assert.equal(c, null);
  });

  it('returns null when control measure not found', async () => {
    memFindUniqueImpl = async () => null;
    const c = await HazardManagementService.getControlMeasure('nope');
    assert.equal(c, null);
  });

  it('lists control measures by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'control_measure') return [makeControlRow()];
      return [];
    };
    const list = await HazardManagementService.listControlMeasures('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a control measure', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    memUpdateImpl = async (args) => makeControlRow({ id: 'mem-cm1', content: args.data.content as string });
    const c = await HazardManagementService.updateControlMeasure('mem-cm1', { status: 'verified' });
    assert.ok(c);
    assert.equal(c!.status, 'verified');
  });

  it('deletes a control measure', async () => {
    memDeleteImpl = async () => ({ id: 'mem-cm1' });
    const ok = await HazardManagementService.deleteControlMeasure('mem-cm1');
    assert.equal(ok, true);
  });

  it('implementControlMeasure sets status to implemented', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    memUpdateImpl = async (args) => makeControlRow({ id: 'mem-cm1', content: args.data.content as string });
    const c = await HazardManagementService.implementControlMeasure('mem-cm1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'implemented');
  });

  it('verifyControlMeasure sets status to verified', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    memUpdateImpl = async (args) => makeControlRow({ id: 'mem-cm1', content: args.data.content as string });
    const c = await HazardManagementService.verifyControlMeasure('mem-cm1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'verified');
  });

  it('deprecateControlMeasure sets status to deprecated', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    memUpdateImpl = async (args) => makeControlRow({ id: 'mem-cm1', content: args.data.content as string });
    const c = await HazardManagementService.deprecateControlMeasure('mem-cm1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'deprecated');
  });

  it('markIneffectiveControlMeasure sets status to ineffective', async () => {
    memFindUniqueImpl = async () => makeControlRow();
    memUpdateImpl = async (args) => makeControlRow({ id: 'mem-cm1', content: args.data.content as string });
    const c = await HazardManagementService.markIneffectiveControlMeasure('mem-cm1', 'user-1');
    assert.ok(c);
    assert.equal(c!.status, 'ineffective');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Job Safety Analyses
// ─────────────────────────────────────────────────────────────────────────────

describe('HazardManagementService — Job Safety Analyses', () => {
  beforeEach(() => resetMock());

  it('creates a JSA with defaults', async () => {
    memCreateImpl = async (args) => makeJSARow({ content: args.data.content as string });
    const j = await HazardManagementService.createJobSafetyAnalysis('org-1', 'ws-1', {
      name: 'High-Risk Task JSA', type: 'high_risk',
    }, 'user-1');
    assert.equal(j.name, 'High-Risk Task JSA');
    assert.equal(j.status, 'draft');
    assert.equal(j.jobTitle, '');
  });

  it('creates a JSA with full input', async () => {
    memCreateImpl = async (args) => makeJSARow({ content: args.data.content as string });
    const j = await HazardManagementService.createJobSafetyAnalysis('org-1', 'ws-1', {
      name: 'Confined Space JSA', type: 'permit_required', description: 'Confined space entry',
      status: 'approved', jobTitle: 'Maintenance Tech', department: 'Facilities',
      supervisor: 'Facilities Manager', steps: '1. Test air 2. Enter 3. Work 4. Exit',
      hazards: 'Low oxygen, toxic gases', controls: 'Gas monitor, ventilation, harness',
      reviewDate: '2028-06-01', approvedBy: 'Safety Director', notes: 'Annual review',
    }, 'user-1');
    assert.equal(j.name, 'Confined Space JSA');
    assert.equal(j.type, 'permit_required');
    assert.equal(j.jobTitle, 'Maintenance Tech');
    assert.equal(j.approvedBy, 'Safety Director');
  });

  it('gets a JSA by id', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    const j = await HazardManagementService.getJobSafetyAnalysis('mem-jsa1');
    assert.ok(j);
    assert.equal(j!.name, 'Chemical Handling JSA');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeJSARow({ type: 'hazard' });
    const j = await HazardManagementService.getJobSafetyAnalysis('mem-jsa1');
    assert.equal(j, null);
  });

  it('returns null when JSA not found', async () => {
    memFindUniqueImpl = async () => null;
    const j = await HazardManagementService.getJobSafetyAnalysis('nope');
    assert.equal(j, null);
  });

  it('lists JSAs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_safety_analysis') return [makeJSARow()];
      return [];
    };
    const list = await HazardManagementService.listJobSafetyAnalyses('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a JSA', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    memUpdateImpl = async (args) => makeJSARow({ id: 'mem-jsa1', content: args.data.content as string });
    const j = await HazardManagementService.updateJobSafetyAnalysis('mem-jsa1', { status: 'approved' });
    assert.ok(j);
    assert.equal(j!.status, 'approved');
  });

  it('deletes a JSA', async () => {
    memDeleteImpl = async () => ({ id: 'mem-jsa1' });
    const ok = await HazardManagementService.deleteJobSafetyAnalysis('mem-jsa1');
    assert.equal(ok, true);
  });

  it('reviewJSA sets status to in_review', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    memUpdateImpl = async (args) => makeJSARow({ id: 'mem-jsa1', content: args.data.content as string });
    const j = await HazardManagementService.reviewJSA('mem-jsa1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'in_review');
  });

  it('approveJSA sets status to approved', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    memUpdateImpl = async (args) => makeJSARow({ id: 'mem-jsa1', content: args.data.content as string });
    const j = await HazardManagementService.approveJSA('mem-jsa1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'approved');
  });

  it('activateJSA sets status to active', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    memUpdateImpl = async (args) => makeJSARow({ id: 'mem-jsa1', content: args.data.content as string });
    const j = await HazardManagementService.activateJSA('mem-jsa1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'active');
  });

  it('archiveJSA sets status to archived', async () => {
    memFindUniqueImpl = async () => makeJSARow();
    memUpdateImpl = async (args) => makeJSARow({ id: 'mem-jsa1', content: args.data.content as string });
    const j = await HazardManagementService.archiveJSA('mem-jsa1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('HazardManagementService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getHazardManagementMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'hazard') return [
        makeRow({ content: JSON.stringify({ name: 'H1', type: 'chemical', status: 'identified', description: '', location: '', source: '', severity: '', likelihood: '', riskLevel: 'high', identifiedBy: '', identifiedDate: null, notes: '' }) }),
        makeRow({ id: 'h2', content: JSON.stringify({ name: 'H2', type: 'physical', status: 'identified', description: '', location: '', source: '', severity: '', likelihood: '', riskLevel: 'low', identifiedBy: '', identifiedDate: null, notes: '' }) }),
      ];
      if (t === 'risk_assessment') return [
        makeAssessmentRow({ content: JSON.stringify({ name: 'RA1', type: 'qualitative', status: 'in_progress', description: '', hazardId: null, assessor: '', assessmentDate: null, methodology: '', likelihood: '', severity: '', riskScore: 0, riskLevel: '', notes: '' }) }),
      ];
      if (t === 'control_measure') return [
        makeControlRow({ content: JSON.stringify({ name: 'CM1', type: 'engineering', status: 'implemented', description: '', hazardId: null, effectiveness: '', implementationDate: null, verifiedBy: '', cost: 0, notes: '' }) }),
      ];
      if (t === 'job_safety_analysis') return [
        makeJSARow({ content: JSON.stringify({ name: 'JSA1', type: 'routine', status: 'active', description: '', jobTitle: '', department: '', supervisor: '', steps: '', hazards: '', controls: '', reviewDate: null, approvedBy: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await HazardManagementService.getHazardManagementMetrics('org-1');
    assert.equal(m.identifiedHazards, 2);
    assert.equal(m.activeAssessments, 1);
    assert.equal(m.implementedControls, 1);
    assert.equal(m.activeJSAs, 1);
    assert.equal(m.highRiskHazards, 1);
  });

  it('getHazardManagementStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'hazard') return [makeRow()];
      if (t === 'risk_assessment') return [makeAssessmentRow()];
      if (t === 'control_measure') return [makeControlRow()];
      if (t === 'job_safety_analysis') return [makeJSARow()];
      return [];
    };
    const s = await HazardManagementService.getHazardManagementStats('org-1');
    assert.equal(s.hazardCount, 1);
    assert.equal(s.riskAssessmentCount, 1);
    assert.equal(s.controlMeasureCount, 1);
    assert.equal(s.jsaCount, 1);
    assert.equal(s.byHazardType['chemical'], 1);
    assert.equal(s.byRiskAssessmentType['qualitative'], 1);
    assert.equal(s.byControlMeasureType['engineering'], 1);
    assert.equal(s.byJSAType['routine'], 1);
  });
});
