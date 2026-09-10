import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FamilyType = 'engineering' | 'sales' | 'marketing' | 'finance' | 'operations' | 'hr' | 'legal' | 'product' | 'design' | 'customer_success' | 'it' | 'administration' | 'executive' | 'other';
export type FamilyStatus = 'active' | 'inactive' | 'deprecated';
export type LevelType = 'individual_contributor' | 'team_lead' | 'manager' | 'senior_manager' | 'director' | 'vp' | 'svp' | 'evp' | 'c_suite' | 'executive';
export type LevelStatus = 'active' | 'inactive' | 'deprecated';
export type RoleType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'temporary' | 'consultant';
export type RoleStatus = 'active' | 'inactive' | 'archived' | 'draft';
export type PathType = 'technical' | 'management' | 'hybrid' | 'lateral' | 'cross_functional';
export type PathStatus = 'active' | 'inactive' | 'archived';

// ── Interfaces ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobFamily {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: FamilyType;
  description: string;
  status: FamilyStatus;
  parentFamilyId: string | null;
  headcount: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobLevel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: LevelType;
  description: string;
  status: LevelStatus;
  grade: number;
  minSalary: number;
  maxSalary: number;
  midSalary: number;
  competencies: string[];
  responsibilities: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobRole {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: RoleType;
  familyId: string | null;
  levelId: string | null;
  description: string;
  status: RoleStatus;
  grade: number;
  salaryRange: string;
  responsibilities: string[];
  qualifications: string[];
  reportsTo: string;
  directReports: number;
  fte: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerPath {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PathType;
  description: string;
  status: PathStatus;
  steps: string[];
  prerequisites: string[];
  estimatedDuration: string;
  certifications: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobArchitectureMetrics {
  activeFamilies: number;
  activeLevels: number;
  activeRoles: number;
  activePaths: number;
  totalHeadcount: number;
}

export interface JobArchitectureStats {
  familyCount: number;
  levelCount: number;
  roleCount: number;
  pathCount: number;
  byFamilyType: Record<string, number>;
  byFamilyStatus: Record<string, number>;
  byLevelType: Record<string, number>;
  byLevelStatus: Record<string, number>;
  byRoleType: Record<string, number>;
  byRoleStatus: Record<string, number>;
  byPathType: Record<string, number>;
  byPathStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateFamilyInput {
  name: string;
  type: FamilyType;
  description?: string;
  status?: FamilyStatus;
  parentFamilyId?: string;
  headcount?: number;
  notes?: string;
}

export interface UpdateFamilyInput {
  name?: string;
  type?: FamilyType;
  description?: string;
  status?: FamilyStatus;
  parentFamilyId?: string;
  headcount?: number;
  notes?: string;
}

export interface ListFamiliesOpts {
  type?: FamilyType;
  status?: FamilyStatus;
}

export interface CreateLevelInput {
  name: string;
  type: LevelType;
  description?: string;
  status?: LevelStatus;
  grade?: number;
  minSalary?: number;
  maxSalary?: number;
  midSalary?: number;
  competencies?: string[];
  responsibilities?: string[];
  notes?: string;
}

export interface UpdateLevelInput {
  name?: string;
  type?: LevelType;
  description?: string;
  status?: LevelStatus;
  grade?: number;
  minSalary?: number;
  maxSalary?: number;
  midSalary?: number;
  competencies?: string[];
  responsibilities?: string[];
  notes?: string;
}

export interface ListLevelsOpts {
  type?: LevelType;
  status?: LevelStatus;
}

export interface CreateRoleInput {
  title: string;
  type: RoleType;
  familyId?: string;
  levelId?: string;
  description?: string;
  status?: RoleStatus;
  grade?: number;
  salaryRange?: string;
  responsibilities?: string[];
  qualifications?: string[];
  reportsTo?: string;
  directReports?: number;
  fte?: number;
  notes?: string;
}

export interface UpdateRoleInput {
  title?: string;
  type?: RoleType;
  familyId?: string;
  levelId?: string;
  description?: string;
  status?: RoleStatus;
  grade?: number;
  salaryRange?: string;
  responsibilities?: string[];
  qualifications?: string[];
  reportsTo?: string;
  directReports?: number;
  fte?: number;
  notes?: string;
}

export interface ListRolesOpts {
  familyId?: string;
  levelId?: string;
  type?: RoleType;
  status?: RoleStatus;
}

export interface CreatePathInput {
  name: string;
  type: PathType;
  description?: string;
  status?: PathStatus;
  steps?: string[];
  prerequisites?: string[];
  estimatedDuration?: string;
  certifications?: string[];
  notes?: string;
}

export interface UpdatePathInput {
  name?: string;
  type?: PathType;
  description?: string;
  status?: PathStatus;
  steps?: string[];
  prerequisites?: string[];
  estimatedDuration?: string;
  certifications?: string[];
  notes?: string;
}

export interface ListPathsOpts {
  type?: PathType;
  status?: PathStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toFamily(row: MemoryRow): JobFamily {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as FamilyType) ?? 'other',
    description: (c.description as string) ?? '',
    status: (c.status as FamilyStatus) ?? 'active',
    parentFamilyId: (c.parentFamilyId as string) ?? null,
    headcount: (c.headcount as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLevel(row: MemoryRow): JobLevel {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as LevelType) ?? 'individual_contributor',
    description: (c.description as string) ?? '',
    status: (c.status as LevelStatus) ?? 'active',
    grade: (c.grade as number) ?? 0,
    minSalary: (c.minSalary as number) ?? 0,
    maxSalary: (c.maxSalary as number) ?? 0,
    midSalary: (c.midSalary as number) ?? 0,
    competencies: (c.competencies as string[]) ?? [],
    responsibilities: (c.responsibilities as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRole(row: MemoryRow): JobRole {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as RoleType) ?? 'full_time',
    familyId: (c.familyId as string) ?? null,
    levelId: (c.levelId as string) ?? null,
    description: (c.description as string) ?? '',
    status: (c.status as RoleStatus) ?? 'draft',
    grade: (c.grade as number) ?? 0,
    salaryRange: (c.salaryRange as string) ?? '',
    responsibilities: (c.responsibilities as string[]) ?? [],
    qualifications: (c.qualifications as string[]) ?? [],
    reportsTo: (c.reportsTo as string) ?? '',
    directReports: (c.directReports as number) ?? 0,
    fte: (c.fte as number) ?? 1,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPath(row: MemoryRow): CareerPath {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PathType) ?? 'technical',
    description: (c.description as string) ?? '',
    status: (c.status as PathStatus) ?? 'active',
    steps: (c.steps as string[]) ?? [],
    prerequisites: (c.prerequisites as string[]) ?? [],
    estimatedDuration: (c.estimatedDuration as string) ?? '',
    certifications: (c.certifications as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const JobArchitectureService = {
  // ── Families ──

  async createFamily(organizationId: string, workspaceId: string, input: CreateFamilyInput, createdBy: string): Promise<JobFamily> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      parentFamilyId: input.parentFamilyId ?? null,
      headcount: input.headcount ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'job_family',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.parentFamilyId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['job_family', content.type, content.status]),
        createdBy,
      },
    });
    return toFamily(row as MemoryRow);
  },

  async getFamily(id: string): Promise<JobFamily | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'job_family') return null;
    return toFamily(row as MemoryRow);
  },

  async listFamilies(organizationId: string, opts: ListFamiliesOpts = {}): Promise<JobFamily[]> {
    const where: Record<string, unknown> = { organizationId, type: 'job_family' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toFamily);
  },

  async updateFamily(id: string, input: UpdateFamilyInput): Promise<JobFamily | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.parentFamilyId !== undefined && { parentFamilyId: input.parentFamilyId }),
      ...(input.headcount !== undefined && { headcount: input.headcount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['job_family', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toFamily(row as MemoryRow);
  },

  async deleteFamily(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Levels ──

  async createLevel(organizationId: string, workspaceId: string, input: CreateLevelInput, createdBy: string): Promise<JobLevel> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      grade: input.grade ?? 0,
      minSalary: input.minSalary ?? 0,
      maxSalary: input.maxSalary ?? 0,
      midSalary: input.midSalary ?? 0,
      competencies: input.competencies ?? [],
      responsibilities: input.responsibilities ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'job_level',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['job_level', content.type, content.status]),
        createdBy,
      },
    });
    return toLevel(row as MemoryRow);
  },

  async getLevel(id: string): Promise<JobLevel | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'job_level') return null;
    return toLevel(row as MemoryRow);
  },

  async listLevels(organizationId: string, opts: ListLevelsOpts = {}): Promise<JobLevel[]> {
    const where: Record<string, unknown> = { organizationId, type: 'job_level' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLevel);
  },

  async updateLevel(id: string, input: UpdateLevelInput): Promise<JobLevel | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.grade !== undefined && { grade: input.grade }),
      ...(input.minSalary !== undefined && { minSalary: input.minSalary }),
      ...(input.maxSalary !== undefined && { maxSalary: input.maxSalary }),
      ...(input.midSalary !== undefined && { midSalary: input.midSalary }),
      ...(input.competencies !== undefined && { competencies: input.competencies }),
      ...(input.responsibilities !== undefined && { responsibilities: input.responsibilities }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['job_level', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toLevel(row as MemoryRow);
  },

  async deleteLevel(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Roles ──

  async createRole(organizationId: string, workspaceId: string, input: CreateRoleInput, createdBy: string): Promise<JobRole> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      familyId: input.familyId ?? null,
      levelId: input.levelId ?? null,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      grade: input.grade ?? 0,
      salaryRange: input.salaryRange ?? '',
      responsibilities: input.responsibilities ?? [],
      qualifications: input.qualifications ?? [],
      reportsTo: input.reportsTo ?? '',
      directReports: input.directReports ?? 0,
      fte: input.fte ?? 1,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'job_role',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.familyId ?? input.levelId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['job_role', content.type, content.status]),
        createdBy,
      },
    });
    return toRole(row as MemoryRow);
  },

  async getRole(id: string): Promise<JobRole | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'job_role') return null;
    return toRole(row as MemoryRow);
  },

  async listRoles(organizationId: string, opts: ListRolesOpts = {}): Promise<JobRole[]> {
    const where: Record<string, unknown> = { organizationId, type: 'job_role' };
    const conditions: unknown[] = [];
    if (opts.familyId) conditions.push({ content: { contains: `"familyId":"${opts.familyId}"` } });
    if (opts.levelId) conditions.push({ content: { contains: `"levelId":"${opts.levelId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRole);
  },

  async updateRole(id: string, input: UpdateRoleInput): Promise<JobRole | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.familyId !== undefined && { familyId: input.familyId }),
      ...(input.levelId !== undefined && { levelId: input.levelId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.grade !== undefined && { grade: input.grade }),
      ...(input.salaryRange !== undefined && { salaryRange: input.salaryRange }),
      ...(input.responsibilities !== undefined && { responsibilities: input.responsibilities }),
      ...(input.qualifications !== undefined && { qualifications: input.qualifications }),
      ...(input.reportsTo !== undefined && { reportsTo: input.reportsTo }),
      ...(input.directReports !== undefined && { directReports: input.directReports }),
      ...(input.fte !== undefined && { fte: input.fte }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['job_role', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRole(row as MemoryRow);
  },

  async deleteRole(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRole(id: string, _activatedBy: string): Promise<JobRole | null> {
    return JobArchitectureService.updateRole(id, { status: 'active' });
  },

  async archiveRole(id: string, _archivedBy: string): Promise<JobRole | null> {
    return JobArchitectureService.updateRole(id, { status: 'archived' });
  },

  // ── Career Paths ──

  async createPath(organizationId: string, workspaceId: string, input: CreatePathInput, createdBy: string): Promise<CareerPath> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      steps: input.steps ?? [],
      prerequisites: input.prerequisites ?? [],
      estimatedDuration: input.estimatedDuration ?? '',
      certifications: input.certifications ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'career_path',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['career_path', content.type, content.status]),
        createdBy,
      },
    });
    return toPath(row as MemoryRow);
  },

  async getPath(id: string): Promise<CareerPath | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'career_path') return null;
    return toPath(row as MemoryRow);
  },

  async listPaths(organizationId: string, opts: ListPathsOpts = {}): Promise<CareerPath[]> {
    const where: Record<string, unknown> = { organizationId, type: 'career_path' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPath);
  },

  async updatePath(id: string, input: UpdatePathInput): Promise<CareerPath | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.steps !== undefined && { steps: input.steps }),
      ...(input.prerequisites !== undefined && { prerequisites: input.prerequisites }),
      ...(input.estimatedDuration !== undefined && { estimatedDuration: input.estimatedDuration }),
      ...(input.certifications !== undefined && { certifications: input.certifications }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['career_path', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPath(row as MemoryRow);
  },

  async deletePath(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getJobArchitectureMetrics(organizationId: string): Promise<JobArchitectureMetrics> {
    const [families, levels, roles, paths] = await Promise.all([
      JobArchitectureService.listFamilies(organizationId),
      JobArchitectureService.listLevels(organizationId),
      JobArchitectureService.listRoles(organizationId),
      JobArchitectureService.listPaths(organizationId),
    ]);
    const activeFamilies = families.filter((f) => f.status === 'active').length;
    const activeLevels = levels.filter((l) => l.status === 'active').length;
    const activeRoles = roles.filter((r) => r.status === 'active').length;
    const activePaths = paths.filter((p) => p.status === 'active').length;
    const totalHeadcount = families.reduce((sum, f) => sum + f.headcount, 0);
    return { activeFamilies, activeLevels, activeRoles, activePaths, totalHeadcount };
  },

  async getJobArchitectureStats(organizationId: string): Promise<JobArchitectureStats> {
    const [families, levels, roles, paths] = await Promise.all([
      JobArchitectureService.listFamilies(organizationId),
      JobArchitectureService.listLevels(organizationId),
      JobArchitectureService.listRoles(organizationId),
      JobArchitectureService.listPaths(organizationId),
    ]);
    const byFamilyType: Record<string, number> = {};
    const byFamilyStatus: Record<string, number> = {};
    const byLevelType: Record<string, number> = {};
    const byLevelStatus: Record<string, number> = {};
    const byRoleType: Record<string, number> = {};
    const byRoleStatus: Record<string, number> = {};
    const byPathType: Record<string, number> = {};
    const byPathStatus: Record<string, number> = {};
    for (const f of families) {
      byFamilyType[f.type] = (byFamilyType[f.type] ?? 0) + 1;
      byFamilyStatus[f.status] = (byFamilyStatus[f.status] ?? 0) + 1;
    }
    for (const l of levels) {
      byLevelType[l.type] = (byLevelType[l.type] ?? 0) + 1;
      byLevelStatus[l.status] = (byLevelStatus[l.status] ?? 0) + 1;
    }
    for (const r of roles) {
      byRoleType[r.type] = (byRoleType[r.type] ?? 0) + 1;
      byRoleStatus[r.status] = (byRoleStatus[r.status] ?? 0) + 1;
    }
    for (const p of paths) {
      byPathType[p.type] = (byPathType[p.type] ?? 0) + 1;
      byPathStatus[p.status] = (byPathStatus[p.status] ?? 0) + 1;
    }
    return {
      familyCount: families.length,
      levelCount: levels.length,
      roleCount: roles.length,
      pathCount: paths.length,
      byFamilyType, byFamilyStatus,
      byLevelType, byLevelStatus,
      byRoleType, byRoleStatus,
      byPathType, byPathStatus,
    };
  },
};
