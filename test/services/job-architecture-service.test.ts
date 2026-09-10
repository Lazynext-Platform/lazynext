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
    type: 'job_family',
    content: JSON.stringify({
      name: 'Engineering',
      type: 'engineering',
      description: 'Engineering family',
      status: 'active',
      parentFamilyId: null,
      headcount: 50,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['job_family', 'engineering', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeLevelRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'job_level',
    content: JSON.stringify({
      name: 'Senior Engineer',
      type: 'individual_contributor',
      description: 'Senior IC level',
      status: 'active',
      grade: 5,
      minSalary: 120000,
      maxSalary: 180000,
      midSalary: 150000,
      competencies: ['System design', 'Mentoring'],
      responsibilities: ['Design systems', 'Review code'],
      notes: '',
    }),
    tags: JSON.stringify(['job_level', 'individual_contributor', 'active']),
    ...overrides,
  });
}

function makeRoleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'job_role',
    content: JSON.stringify({
      title: 'Staff Software Engineer',
      type: 'full_time',
      familyId: 'mem-1',
      levelId: 'mem-l1',
      description: 'Staff engineer role',
      status: 'draft',
      grade: 6,
      salaryRange: '$150k–$220k',
      responsibilities: ['Lead projects', 'Mentor juniors'],
      qualifications: ['BS degree', '8+ years experience'],
      reportsTo: 'Engineering Director',
      directReports: 0,
      fte: 1,
      notes: '',
    }),
    tags: JSON.stringify(['job_role', 'full_time', 'draft']),
    ...overrides,
  });
}

function makePathRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'career_path',
    content: JSON.stringify({
      name: 'IC Engineering Track',
      type: 'technical',
      description: 'Individual contributor track',
      status: 'active',
      steps: ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'],
      prerequisites: ['CS degree or equivalent'],
      estimatedDuration: '8–12 years',
      certifications: ['AWS Certified'],
      notes: '',
    }),
    tags: JSON.stringify(['career_path', 'technical', 'active']),
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

const { JobArchitectureService } = await import('@/lib/services/job-architecture-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Families
// ─────────────────────────────────────────────────────────────────────────────

describe('JobArchitectureService — Families', () => {
  beforeEach(() => resetMock());

  it('creates a family with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const f = await JobArchitectureService.createFamily('org-1', 'ws-1', {
      name: 'Engineering', type: 'engineering',
    }, 'user-1');
    assert.equal(f.name, 'Engineering');
    assert.equal(f.status, 'active');
    assert.equal(f.headcount, 0);
    assert.equal(f.parentFamilyId, null);
  });

  it('creates a family with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const f = await JobArchitectureService.createFamily('org-1', 'ws-1', {
      name: 'Sales', type: 'sales', description: 'Sales organization',
      status: 'inactive', parentFamilyId: 'mem-parent', headcount: 25, notes: 'Q1 2028',
    }, 'user-1');
    assert.equal(f.name, 'Sales');
    assert.equal(f.type, 'sales');
    assert.equal(f.description, 'Sales organization');
    assert.equal(f.status, 'inactive');
    assert.equal(f.parentFamilyId, 'mem-parent');
    assert.equal(f.headcount, 25);
    assert.equal(f.notes, 'Q1 2028');
  });

  it('gets a family by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const f = await JobArchitectureService.getFamily('mem-1');
    assert.ok(f);
    assert.equal(f!.id, 'mem-1');
    assert.equal(f!.name, 'Engineering');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'job_level' });
    const f = await JobArchitectureService.getFamily('mem-1');
    assert.equal(f, null);
  });

  it('returns null when family not found', async () => {
    memFindUniqueImpl = async () => null;
    const f = await JobArchitectureService.getFamily('nope');
    assert.equal(f, null);
  });

  it('lists families by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_family') return [makeRow()];
      return [];
    };
    const list = await JobArchitectureService.listFamilies('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Engineering');
  });

  it('updates a family', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const f = await JobArchitectureService.updateFamily('mem-1', { status: 'inactive', headcount: 100 });
    assert.ok(f);
    assert.equal(f!.status, 'inactive');
    assert.equal(f!.headcount, 100);
  });

  it('returns null when updating non-existent family', async () => {
    memFindUniqueImpl = async () => null;
    const f = await JobArchitectureService.updateFamily('nope', { name: 'X' });
    assert.equal(f, null);
  });

  it('deletes a family', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await JobArchitectureService.deleteFamily('mem-1');
    assert.equal(ok, true);
  });

  it('returns false when deleting non-existent family', async () => {
    memDeleteImpl = async () => { throw new Error('not found'); };
    const ok = await JobArchitectureService.deleteFamily('nope');
    assert.equal(ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Levels
// ─────────────────────────────────────────────────────────────────────────────

describe('JobArchitectureService — Levels', () => {
  beforeEach(() => resetMock());

  it('creates a level with defaults', async () => {
    memCreateImpl = async (args) => makeLevelRow({ content: args.data.content as string });
    const l = await JobArchitectureService.createLevel('org-1', 'ws-1', {
      name: 'Junior Engineer', type: 'individual_contributor',
    }, 'user-1');
    assert.equal(l.name, 'Junior Engineer');
    assert.equal(l.status, 'active');
    assert.equal(l.grade, 0);
    assert.equal(l.minSalary, 0);
    assert.equal(l.competencies.length, 0);
  });

  it('creates a level with full input', async () => {
    memCreateImpl = async (args) => makeLevelRow({ content: args.data.content as string });
    const l = await JobArchitectureService.createLevel('org-1', 'ws-1', {
      name: 'Engineering Manager', type: 'manager', description: 'Manages a team',
      status: 'inactive', grade: 7, minSalary: 150000, maxSalary: 220000, midSalary: 185000,
      competencies: ['Leadership', 'Strategy'], responsibilities: ['Team management', 'Hiring'],
      notes: '2028 review',
    }, 'user-1');
    assert.equal(l.name, 'Engineering Manager');
    assert.equal(l.type, 'manager');
    assert.equal(l.grade, 7);
    assert.equal(l.minSalary, 150000);
    assert.equal(l.maxSalary, 220000);
    assert.equal(l.midSalary, 185000);
    assert.equal(l.competencies.length, 2);
    assert.equal(l.responsibilities.length, 2);
    assert.equal(l.notes, '2028 review');
  });

  it('gets a level by id', async () => {
    memFindUniqueImpl = async () => makeLevelRow();
    const l = await JobArchitectureService.getLevel('mem-l1');
    assert.ok(l);
    assert.equal(l!.id, 'mem-l1');
    assert.equal(l!.name, 'Senior Engineer');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLevelRow({ type: 'job_family' });
    const l = await JobArchitectureService.getLevel('mem-l1');
    assert.equal(l, null);
  });

  it('returns null when level not found', async () => {
    memFindUniqueImpl = async () => null;
    const l = await JobArchitectureService.getLevel('nope');
    assert.equal(l, null);
  });

  it('lists levels by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_level') return [makeLevelRow()];
      return [];
    };
    const list = await JobArchitectureService.listLevels('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Senior Engineer');
  });

  it('updates a level', async () => {
    memFindUniqueImpl = async () => makeLevelRow();
    memUpdateImpl = async (args) => makeLevelRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await JobArchitectureService.updateLevel('mem-l1', { status: 'deprecated', grade: 8 });
    assert.ok(l);
    assert.equal(l!.status, 'deprecated');
    assert.equal(l!.grade, 8);
  });

  it('returns null when updating non-existent level', async () => {
    memFindUniqueImpl = async () => null;
    const l = await JobArchitectureService.updateLevel('nope', { name: 'X' });
    assert.equal(l, null);
  });

  it('deletes a level', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await JobArchitectureService.deleteLevel('mem-l1');
    assert.equal(ok, true);
  });

  it('returns false when deleting non-existent level', async () => {
    memDeleteImpl = async () => { throw new Error('not found'); };
    const ok = await JobArchitectureService.deleteLevel('nope');
    assert.equal(ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Roles
// ─────────────────────────────────────────────────────────────────────────────

describe('JobArchitectureService — Roles', () => {
  beforeEach(() => resetMock());

  it('creates a role with defaults', async () => {
    memCreateImpl = async (args) => makeRoleRow({ content: args.data.content as string });
    const r = await JobArchitectureService.createRole('org-1', 'ws-1', {
      title: 'Junior Developer', type: 'full_time',
    }, 'user-1');
    assert.equal(r.title, 'Junior Developer');
    assert.equal(r.status, 'draft');
    assert.equal(r.grade, 0);
    assert.equal(r.fte, 1);
    assert.equal(r.directReports, 0);
    assert.equal(r.responsibilities.length, 0);
  });

  it('creates a role with full input', async () => {
    memCreateImpl = async (args) => makeRoleRow({ content: args.data.content as string });
    const r = await JobArchitectureService.createRole('org-1', 'ws-1', {
      title: 'Engineering Director', type: 'full_time', familyId: 'mem-1', levelId: 'mem-l1',
      description: 'Director of engineering', status: 'active', grade: 9,
      salaryRange: '$200k–$300k', responsibilities: ['Set strategy', 'Manage managers'],
      qualifications: ['MBA preferred'], reportsTo: 'VP Engineering', directReports: 5,
      fte: 1, notes: '2028 org',
    }, 'user-1');
    assert.equal(r.title, 'Engineering Director');
    assert.equal(r.type, 'full_time');
    assert.equal(r.familyId, 'mem-1');
    assert.equal(r.levelId, 'mem-l1');
    assert.equal(r.status, 'active');
    assert.equal(r.grade, 9);
    assert.equal(r.salaryRange, '$200k–$300k');
    assert.equal(r.responsibilities.length, 2);
    assert.equal(r.qualifications.length, 1);
    assert.equal(r.reportsTo, 'VP Engineering');
    assert.equal(r.directReports, 5);
    assert.equal(r.notes, '2028 org');
  });

  it('gets a role by id', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    const r = await JobArchitectureService.getRole('mem-r1');
    assert.ok(r);
    assert.equal(r!.id, 'mem-r1');
    assert.equal(r!.title, 'Staff Software Engineer');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRoleRow({ type: 'job_family' });
    const r = await JobArchitectureService.getRole('mem-r1');
    assert.equal(r, null);
  });

  it('returns null when role not found', async () => {
    memFindUniqueImpl = async () => null;
    const r = await JobArchitectureService.getRole('nope');
    assert.equal(r, null);
  });

  it('lists roles by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_role') return [makeRoleRow()];
      return [];
    };
    const list = await JobArchitectureService.listRoles('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'Staff Software Engineer');
  });

  it('updates a role', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await JobArchitectureService.updateRole('mem-r1', { status: 'active', grade: 7, directReports: 3 });
    assert.ok(r);
    assert.equal(r!.status, 'active');
    assert.equal(r!.grade, 7);
    assert.equal(r!.directReports, 3);
  });

  it('returns null when updating non-existent role', async () => {
    memFindUniqueImpl = async () => null;
    const r = await JobArchitectureService.updateRole('nope', { title: 'X' });
    assert.equal(r, null);
  });

  it('deletes a role', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await JobArchitectureService.deleteRole('mem-r1');
    assert.equal(ok, true);
  });

  it('returns false when deleting non-existent role', async () => {
    memDeleteImpl = async () => { throw new Error('not found'); };
    const ok = await JobArchitectureService.deleteRole('nope');
    assert.equal(ok, false);
  });

  it('activateRole sets status to active', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await JobArchitectureService.activateRole('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'active');
  });

  it('archiveRole sets status to archived', async () => {
    memFindUniqueImpl = async () => makeRoleRow();
    memUpdateImpl = async (args) => makeRoleRow({ id: 'mem-r1', content: args.data.content as string });
    const r = await JobArchitectureService.archiveRole('mem-r1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Career Paths
// ─────────────────────────────────────────────────────────────────────────────

describe('JobArchitectureService — Career Paths', () => {
  beforeEach(() => resetMock());

  it('creates a path with defaults', async () => {
    memCreateImpl = async (args) => makePathRow({ content: args.data.content as string });
    const p = await JobArchitectureService.createPath('org-1', 'ws-1', {
      name: 'Management Track', type: 'management',
    }, 'user-1');
    assert.equal(p.name, 'Management Track');
    assert.equal(p.status, 'active');
    assert.equal(p.steps.length, 0);
    assert.equal(p.prerequisites.length, 0);
    assert.equal(p.certifications.length, 0);
  });

  it('creates a path with full input', async () => {
    memCreateImpl = async (args) => makePathRow({ content: args.data.content as string });
    const p = await JobArchitectureService.createPath('org-1', 'ws-1', {
      name: 'Hybrid Track', type: 'hybrid', description: 'Mix of IC and management',
      status: 'inactive', steps: ['IC', 'Lead', 'Manager'],
      prerequisites: ['2 years IC experience'], estimatedDuration: '3–5 years',
      certifications: ['PMP'], notes: '2028 program',
    }, 'user-1');
    assert.equal(p.name, 'Hybrid Track');
    assert.equal(p.type, 'hybrid');
    assert.equal(p.description, 'Mix of IC and management');
    assert.equal(p.status, 'inactive');
    assert.equal(p.steps.length, 3);
    assert.equal(p.prerequisites.length, 1);
    assert.equal(p.estimatedDuration, '3–5 years');
    assert.equal(p.certifications.length, 1);
    assert.equal(p.notes, '2028 program');
  });

  it('gets a path by id', async () => {
    memFindUniqueImpl = async () => makePathRow();
    const p = await JobArchitectureService.getPath('mem-p1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-p1');
    assert.equal(p!.name, 'IC Engineering Track');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePathRow({ type: 'job_family' });
    const p = await JobArchitectureService.getPath('mem-p1');
    assert.equal(p, null);
  });

  it('returns null when path not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await JobArchitectureService.getPath('nope');
    assert.equal(p, null);
  });

  it('lists paths by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'career_path') return [makePathRow()];
      return [];
    };
    const list = await JobArchitectureService.listPaths('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'IC Engineering Track');
  });

  it('updates a path', async () => {
    memFindUniqueImpl = async () => makePathRow();
    memUpdateImpl = async (args) => makePathRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await JobArchitectureService.updatePath('mem-p1', { status: 'archived', estimatedDuration: '10 years' });
    assert.ok(p);
    assert.equal(p!.status, 'archived');
    assert.equal(p!.estimatedDuration, '10 years');
  });

  it('returns null when updating non-existent path', async () => {
    memFindUniqueImpl = async () => null;
    const p = await JobArchitectureService.updatePath('nope', { name: 'X' });
    assert.equal(p, null);
  });

  it('deletes a path', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await JobArchitectureService.deletePath('mem-p1');
    assert.equal(ok, true);
  });

  it('returns false when deleting non-existent path', async () => {
    memDeleteImpl = async () => { throw new Error('not found'); };
    const ok = await JobArchitectureService.deletePath('nope');
    assert.equal(ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('JobArchitectureService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getJobArchitectureMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_family') return [
        makeRow({ content: JSON.stringify({ name: 'F1', type: 'engineering', status: 'active', headcount: 30, parentFamilyId: null, description: '', notes: '' }) }),
        makeRow({ id: 'f2', content: JSON.stringify({ name: 'F2', type: 'sales', status: 'inactive', headcount: 20, parentFamilyId: null, description: '', notes: '' }) }),
      ];
      if (t === 'job_level') return [
        makeLevelRow({ content: JSON.stringify({ name: 'L1', type: 'individual_contributor', status: 'active', grade: 3, minSalary: 0, maxSalary: 0, midSalary: 0, competencies: [], responsibilities: [], description: '', notes: '' }) }),
      ];
      if (t === 'job_role') return [
        makeRoleRow({ content: JSON.stringify({ title: 'R1', type: 'full_time', familyId: null, levelId: null, status: 'active', grade: 0, salaryRange: '', responsibilities: [], qualifications: [], reportsTo: '', directReports: 0, fte: 1, description: '', notes: '' }) }),
        makeRoleRow({ id: 'r2', content: JSON.stringify({ title: 'R2', type: 'part_time', familyId: null, levelId: null, status: 'draft', grade: 0, salaryRange: '', responsibilities: [], qualifications: [], reportsTo: '', directReports: 0, fte: 0.5, description: '', notes: '' }) }),
      ];
      if (t === 'career_path') return [
        makePathRow({ content: JSON.stringify({ name: 'P1', type: 'technical', status: 'active', steps: [], prerequisites: [], estimatedDuration: '', certifications: [], description: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await JobArchitectureService.getJobArchitectureMetrics('org-1');
    assert.equal(m.activeFamilies, 1);
    assert.equal(m.activeLevels, 1);
    assert.equal(m.activeRoles, 1);
    assert.equal(m.activePaths, 1);
    assert.equal(m.totalHeadcount, 50);
  });

  it('getJobArchitectureMetrics returns zeros when empty', async () => {
    memFindManyImpl = async () => [];
    const m = await JobArchitectureService.getJobArchitectureMetrics('org-1');
    assert.equal(m.activeFamilies, 0);
    assert.equal(m.activeLevels, 0);
    assert.equal(m.activeRoles, 0);
    assert.equal(m.activePaths, 0);
    assert.equal(m.totalHeadcount, 0);
  });

  it('getJobArchitectureStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'job_family') return [makeRow()];
      if (t === 'job_level') return [makeLevelRow()];
      if (t === 'job_role') return [makeRoleRow()];
      if (t === 'career_path') return [makePathRow()];
      return [];
    };
    const s = await JobArchitectureService.getJobArchitectureStats('org-1');
    assert.equal(s.familyCount, 1);
    assert.equal(s.levelCount, 1);
    assert.equal(s.roleCount, 1);
    assert.equal(s.pathCount, 1);
    assert.equal(s.byFamilyType['engineering'], 1);
    assert.equal(s.byFamilyStatus['active'], 1);
    assert.equal(s.byLevelType['individual_contributor'], 1);
    assert.equal(s.byLevelStatus['active'], 1);
    assert.equal(s.byRoleType['full_time'], 1);
    assert.equal(s.byRoleStatus['draft'], 1);
    assert.equal(s.byPathType['technical'], 1);
    assert.equal(s.byPathStatus['active'], 1);
  });

  it('getJobArchitectureStats returns empty breakdowns when no data', async () => {
    memFindManyImpl = async () => [];
    const s = await JobArchitectureService.getJobArchitectureStats('org-1');
    assert.equal(s.familyCount, 0);
    assert.equal(s.levelCount, 0);
    assert.equal(s.roleCount, 0);
    assert.equal(s.pathCount, 0);
    assert.equal(Object.keys(s.byFamilyType).length, 0);
    assert.equal(Object.keys(s.byRoleStatus).length, 0);
  });
});
