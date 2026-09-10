import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type InitiativeType = 'recruitment' | 'training' | 'policy' | 'mentorship' | 'employee_resource_group' | 'pay_equity' | 'accessibility' | 'supplier_diversity' | 'community_outreach' | 'other';
export type InitiativeStatus = 'planning' | 'active' | 'paused' | 'completed' | 'discontinued';
export type MetricCategory = 'gender' | 'ethnicity' | 'age' | 'disability' | 'veteran_status' | 'lgbtq' | 'education' | 'tenure' | 'leadership_represention';
export type MetricPeriod = 'monthly' | 'quarterly' | 'annual';
export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'missed';
export type GoalType = 'representation' | 'retention' | 'promotion' | 'hiring' | 'pay_equity' | 'training_completion';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string | null;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface DeiInitiativeContent {
  name: string;
  type: InitiativeType;
  description: string;
  owner: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: InitiativeStatus;
  objectives: string;
  targetGroups: string;
  metrics: string;
}

interface DeiMetricContent {
  category: MetricCategory;
  period: MetricPeriod;
  periodLabel: string;
  metricName: string;
  value: number;
  target: number;
  unit: string;
  description: string;
  demographicBreakdown: string;
  notes: string;
}

interface DeiTrainingContent {
  title: string;
  description: string;
  facilitator: string;
  audience: string;
  format: string;
  duration: number;
  scheduledDate: string;
  status: TrainingStatus;
  materials: string;
  completionRate: number;
  notes: string;
}

interface DeiGoalContent {
  type: GoalType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: GoalStatus;
  initiativeId: string;
  owner: string;
}

// ── Public interfaces ──

export interface DeiInitiative {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: InitiativeType;
  description: string;
  owner: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  status: InitiativeStatus;
  objectives: string;
  targetGroups: string;
  metrics: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeiMetric {
  id: string;
  organizationId: string;
  workspaceId: string;
  category: MetricCategory;
  period: MetricPeriod;
  periodLabel: string;
  metricName: string;
  value: number;
  target: number;
  unit: string;
  description: string;
  demographicBreakdown: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeiTraining {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  facilitator: string;
  audience: string;
  format: string;
  duration: number;
  scheduledDate: Date | null;
  status: TrainingStatus;
  materials: string;
  completionRate: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeiGoal {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: GoalType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date | null;
  status: GoalStatus;
  initiativeId: string;
  owner: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeiMetrics {
  activeInitiatives: number;
  trainingCompletion: number;
  goalProgress: number;
  representationSummary: Record<string, number>;
}

export interface DeiStats {
  initiativeCount: number;
  activeInitiativeCount: number;
  metricCount: number;
  trainingCount: number;
  completedTrainingCount: number;
  goalCount: number;
  achievedGoalCount: number;
  byInitiativeType: Record<string, number>;
  byInitiativeStatus: Record<string, number>;
  byTrainingStatus: Record<string, number>;
  byGoalStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateInitiativeInput {
  name: string;
  type: InitiativeType;
  description?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: InitiativeStatus;
  objectives?: string;
  targetGroups?: string;
  metrics?: string;
}

export interface UpdateInitiativeInput {
  name?: string;
  type?: InitiativeType;
  description?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: InitiativeStatus;
  objectives?: string;
  targetGroups?: string;
  metrics?: string;
}

export interface ListInitiativesOpts {
  type?: InitiativeType;
  status?: InitiativeStatus;
  owner?: string;
}

export interface CreateMetricInput {
  category: MetricCategory;
  period: MetricPeriod;
  periodLabel: string;
  metricName: string;
  value: number;
  target?: number;
  unit?: string;
  description?: string;
  demographicBreakdown?: string;
  notes?: string;
}

export interface UpdateMetricInput {
  category?: MetricCategory;
  period?: MetricPeriod;
  periodLabel?: string;
  metricName?: string;
  value?: number;
  target?: number;
  unit?: string;
  description?: string;
  demographicBreakdown?: string;
  notes?: string;
}

export interface ListMetricsOpts {
  category?: MetricCategory;
  period?: MetricPeriod;
  periodLabel?: string;
}

export interface CreateTrainingInput {
  title: string;
  description?: string;
  facilitator?: string;
  audience?: string;
  format?: string;
  duration?: number;
  scheduledDate?: string;
  status?: TrainingStatus;
  materials?: string;
  completionRate?: number;
  notes?: string;
}

export interface UpdateTrainingInput {
  title?: string;
  description?: string;
  facilitator?: string;
  audience?: string;
  format?: string;
  duration?: number;
  scheduledDate?: string;
  status?: TrainingStatus;
  materials?: string;
  completionRate?: number;
  notes?: string;
}

export interface ListTrainingsOpts {
  status?: TrainingStatus;
  facilitator?: string;
}

export interface CreateGoalInput {
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  deadline?: string;
  status?: GoalStatus;
  initiativeId?: string;
  owner?: string;
}

export interface UpdateGoalInput {
  type?: GoalType;
  title?: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  deadline?: string;
  status?: GoalStatus;
  initiativeId?: string;
  owner?: string;
}

export interface ListGoalsOpts {
  type?: GoalType;
  status?: GoalStatus;
  owner?: string;
}

// ── Helpers ──

const fallbackInitiative: DeiInitiativeContent = {
  name: '', type: 'other', description: '', owner: '', startDate: '', endDate: '',
  budget: 0, status: 'planning', objectives: '', targetGroups: '', metrics: '',
};

const fallbackMetric: DeiMetricContent = {
  category: 'gender', period: 'annual', periodLabel: '', metricName: '', value: 0,
  target: 0, unit: '%', description: '', demographicBreakdown: '', notes: '',
};

const fallbackTraining: DeiTrainingContent = {
  title: '', description: '', facilitator: '', audience: '', format: '', duration: 0,
  scheduledDate: '', status: 'scheduled', materials: '', completionRate: 0, notes: '',
};

const fallbackGoal: DeiGoalContent = {
  type: 'representation', title: '', description: '', targetValue: 0, currentValue: 0,
  unit: '%', deadline: '', status: 'on_track', initiativeId: '', owner: '',
};

function parseInitiative(raw: string): DeiInitiativeContent {
  if (!raw) return fallbackInitiative;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as InitiativeType) ?? 'other',
      description: p.description ?? '',
      owner: p.owner ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      budget: p.budget ?? 0,
      status: (p.status as InitiativeStatus) ?? 'planning',
      objectives: p.objectives ?? '',
      targetGroups: p.targetGroups ?? '',
      metrics: p.metrics ?? '',
    };
  } catch { return fallbackInitiative; }
}

function parseMetric(raw: string): DeiMetricContent {
  if (!raw) return fallbackMetric;
  try {
    const p = JSON.parse(raw);
    return {
      category: (p.category as MetricCategory) ?? 'gender',
      period: (p.period as MetricPeriod) ?? 'annual',
      periodLabel: p.periodLabel ?? '',
      metricName: p.metricName ?? '',
      value: p.value ?? 0,
      target: p.target ?? 0,
      unit: p.unit ?? '%',
      description: p.description ?? '',
      demographicBreakdown: p.demographicBreakdown ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackMetric; }
}

function parseTraining(raw: string): DeiTrainingContent {
  if (!raw) return fallbackTraining;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      description: p.description ?? '',
      facilitator: p.facilitator ?? '',
      audience: p.audience ?? '',
      format: p.format ?? '',
      duration: p.duration ?? 0,
      scheduledDate: p.scheduledDate ?? '',
      status: (p.status as TrainingStatus) ?? 'scheduled',
      materials: p.materials ?? '',
      completionRate: p.completionRate ?? 0,
      notes: p.notes ?? '',
    };
  } catch { return fallbackTraining; }
}

function parseGoal(raw: string): DeiGoalContent {
  if (!raw) return fallbackGoal;
  try {
    const p = JSON.parse(raw);
    return {
      type: (p.type as GoalType) ?? 'representation',
      title: p.title ?? '',
      description: p.description ?? '',
      targetValue: p.targetValue ?? 0,
      currentValue: p.currentValue ?? 0,
      unit: p.unit ?? '%',
      deadline: p.deadline ?? '',
      status: (p.status as GoalStatus) ?? 'on_track',
      initiativeId: p.initiativeId ?? '',
      owner: p.owner ?? '',
    };
  } catch { return fallbackGoal; }
}

function toInitiative(row: MemoryRow): DeiInitiative {
  const c = parseInitiative(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, description: c.description, owner: c.owner,
    startDate: c.startDate ? new Date(c.startDate) : null,
    endDate: c.endDate ? new Date(c.endDate) : null,
    budget: c.budget, status: c.status, objectives: c.objectives,
    targetGroups: c.targetGroups, metrics: c.metrics,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toMetric(row: MemoryRow): DeiMetric {
  const c = parseMetric(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    category: c.category, period: c.period, periodLabel: c.periodLabel,
    metricName: c.metricName, value: c.value, target: c.target, unit: c.unit,
    description: c.description, demographicBreakdown: c.demographicBreakdown, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTraining(row: MemoryRow): DeiTraining {
  const c = parseTraining(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, description: c.description, facilitator: c.facilitator,
    audience: c.audience, format: c.format, duration: c.duration,
    scheduledDate: c.scheduledDate ? new Date(c.scheduledDate) : null,
    status: c.status, materials: c.materials, completionRate: c.completionRate, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toGoal(row: MemoryRow): DeiGoal {
  const c = parseGoal(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    type: c.type, title: c.title, description: c.description,
    targetValue: c.targetValue, currentValue: c.currentValue, unit: c.unit,
    deadline: c.deadline ? new Date(c.deadline) : null,
    status: c.status, initiativeId: c.initiativeId, owner: c.owner,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── DEI Service ──

export const DeiService = {
  // ── Initiatives ──

  async createInitiative(
    organizationId: string,
    workspaceId: string,
    input: CreateInitiativeInput,
    createdBy: string,
  ): Promise<DeiInitiative> {
    const content: DeiInitiativeContent = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      owner: input.owner ?? '',
      startDate: input.startDate ?? '',
      endDate: input.endDate ?? '',
      budget: input.budget ?? 0,
      status: input.status ?? 'planning',
      objectives: input.objectives ?? '',
      targetGroups: input.targetGroups ?? '',
      metrics: input.metrics ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dei_initiative',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dei_initiative', content.type, content.status]),
        createdBy,
      },
    });

    return toInitiative(row as MemoryRow);
  },

  async getInitiative(id: string): Promise<DeiInitiative | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dei_initiative') return null;
    return toInitiative(row as MemoryRow);
  },

  async listInitiatives(organizationId: string, opts: ListInitiativesOpts = {}): Promise<DeiInitiative[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dei_initiative', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toInitiative(r as MemoryRow));
    if (opts.type) records = records.filter((i) => i.type === opts.type);
    if (opts.status) records = records.filter((i) => i.status === opts.status);
    if (opts.owner) records = records.filter((i) => i.owner === opts.owner);
    return records;
  },

  async updateInitiative(id: string, input: UpdateInitiativeInput): Promise<DeiInitiative | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseInitiative(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.status !== undefined) content.status = input.status;
    if (input.objectives !== undefined) content.objectives = input.objectives;
    if (input.targetGroups !== undefined) content.targetGroups = input.targetGroups;
    if (input.metrics !== undefined) content.metrics = input.metrics;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_initiative', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toInitiative(row as MemoryRow);
  },

  async deleteInitiative(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async activateInitiative(id: string, activatedBy: string): Promise<DeiInitiative | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseInitiative(existing.content);
    content.status = 'active';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_initiative', content.type, 'active']),
          verifiedBy: activatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toInitiative(row as MemoryRow);
  },

  // ── Metrics ──

  async createMetric(
    organizationId: string,
    workspaceId: string,
    input: CreateMetricInput,
    createdBy: string,
  ): Promise<DeiMetric> {
    const content: DeiMetricContent = {
      category: input.category,
      period: input.period,
      periodLabel: input.periodLabel,
      metricName: input.metricName,
      value: input.value,
      target: input.target ?? 0,
      unit: input.unit ?? '%',
      description: input.description ?? '',
      demographicBreakdown: input.demographicBreakdown ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dei_metric',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dei_metric', content.category, content.period]),
        createdBy,
      },
    });

    return toMetric(row as MemoryRow);
  },

  async getMetric(id: string): Promise<DeiMetric | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dei_metric') return null;
    return toMetric(row as MemoryRow);
  },

  async listMetrics(organizationId: string, opts: ListMetricsOpts = {}): Promise<DeiMetric[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dei_metric', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toMetric(r as MemoryRow));
    if (opts.category) records = records.filter((m) => m.category === opts.category);
    if (opts.period) records = records.filter((m) => m.period === opts.period);
    if (opts.periodLabel) records = records.filter((m) => m.periodLabel === opts.periodLabel);
    return records;
  },

  async updateMetric(id: string, input: UpdateMetricInput): Promise<DeiMetric | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseMetric(existing.content);
    if (input.category !== undefined) content.category = input.category;
    if (input.period !== undefined) content.period = input.period;
    if (input.periodLabel !== undefined) content.periodLabel = input.periodLabel;
    if (input.metricName !== undefined) content.metricName = input.metricName;
    if (input.value !== undefined) content.value = input.value;
    if (input.target !== undefined) content.target = input.target;
    if (input.unit !== undefined) content.unit = input.unit;
    if (input.description !== undefined) content.description = input.description;
    if (input.demographicBreakdown !== undefined) content.demographicBreakdown = input.demographicBreakdown;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_metric', content.category, content.period]),
        },
      }), null,
    );
    if (!row) return null;
    return toMetric(row as MemoryRow);
  },

  async deleteMetric(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Training ──

  async createTraining(
    organizationId: string,
    workspaceId: string,
    input: CreateTrainingInput,
    createdBy: string,
  ): Promise<DeiTraining> {
    const content: DeiTrainingContent = {
      title: input.title.trim(),
      description: input.description ?? '',
      facilitator: input.facilitator ?? '',
      audience: input.audience ?? '',
      format: input.format ?? '',
      duration: input.duration ?? 0,
      scheduledDate: input.scheduledDate ?? '',
      status: input.status ?? 'scheduled',
      materials: input.materials ?? '',
      completionRate: input.completionRate ?? 0,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dei_training',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dei_training', content.status]),
        createdBy,
      },
    });

    return toTraining(row as MemoryRow);
  },

  async getTraining(id: string): Promise<DeiTraining | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dei_training') return null;
    return toTraining(row as MemoryRow);
  },

  async listTrainings(organizationId: string, opts: ListTrainingsOpts = {}): Promise<DeiTraining[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dei_training', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTraining(r as MemoryRow));
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    if (opts.facilitator) records = records.filter((t) => t.facilitator === opts.facilitator);
    return records;
  },

  async updateTraining(id: string, input: UpdateTrainingInput): Promise<DeiTraining | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTraining(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.facilitator !== undefined) content.facilitator = input.facilitator;
    if (input.audience !== undefined) content.audience = input.audience;
    if (input.format !== undefined) content.format = input.format;
    if (input.duration !== undefined) content.duration = input.duration;
    if (input.scheduledDate !== undefined) content.scheduledDate = input.scheduledDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.materials !== undefined) content.materials = input.materials;
    if (input.completionRate !== undefined) content.completionRate = input.completionRate;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_training', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTraining(row as MemoryRow);
  },

  async completeTraining(id: string, completionRate: number, completedBy: string): Promise<DeiTraining | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTraining(existing.content);
    content.status = 'completed';
    content.completionRate = completionRate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_training', 'completed']),
          verifiedBy: completedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toTraining(row as MemoryRow);
  },

  // ── Goals ──

  async createGoal(
    organizationId: string,
    workspaceId: string,
    input: CreateGoalInput,
    createdBy: string,
  ): Promise<DeiGoal> {
    const content: DeiGoalContent = {
      type: input.type,
      title: input.title.trim(),
      description: input.description ?? '',
      targetValue: input.targetValue,
      currentValue: input.currentValue ?? 0,
      unit: input.unit ?? '%',
      deadline: input.deadline ?? '',
      status: input.status ?? 'on_track',
      initiativeId: input.initiativeId ?? '',
      owner: input.owner ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'dei_goal',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.initiativeId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['dei_goal', content.type, content.status]),
        createdBy,
      },
    });

    return toGoal(row as MemoryRow);
  },

  async getGoal(id: string): Promise<DeiGoal | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'dei_goal') return null;
    return toGoal(row as MemoryRow);
  },

  async listGoals(organizationId: string, opts: ListGoalsOpts = {}): Promise<DeiGoal[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'dei_goal', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toGoal(r as MemoryRow));
    if (opts.type) records = records.filter((g) => g.type === opts.type);
    if (opts.status) records = records.filter((g) => g.status === opts.status);
    if (opts.owner) records = records.filter((g) => g.owner === opts.owner);
    return records;
  },

  async updateGoal(id: string, input: UpdateGoalInput): Promise<DeiGoal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseGoal(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.targetValue !== undefined) content.targetValue = input.targetValue;
    if (input.unit !== undefined) content.unit = input.unit;
    if (input.deadline !== undefined) content.deadline = input.deadline;
    if (input.status !== undefined) content.status = input.status;
    if (input.initiativeId !== undefined) content.initiativeId = input.initiativeId;
    if (input.owner !== undefined) content.owner = input.owner;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_goal', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toGoal(row as MemoryRow);
  },

  async updateGoalProgress(id: string, currentValue: number, updatedBy: string): Promise<DeiGoal | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseGoal(existing.content);
    content.currentValue = currentValue;
    const pct = content.targetValue > 0 ? (currentValue / content.targetValue) * 100 : 0;
    if (pct >= 100) content.status = 'achieved';
    else if (pct >= 75) content.status = 'on_track';
    else if (pct >= 50) content.status = 'at_risk';
    else content.status = 'behind';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['dei_goal', content.type, content.status]),
          verifiedBy: updatedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toGoal(row as MemoryRow);
  },

  async deleteGoal(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Metrics Summary ──

  async getDeiMetrics(organizationId: string): Promise<DeiMetrics> {
    const [initiatives, trainings, goals, metrics] = await Promise.all([
      DeiService.listInitiatives(organizationId),
      DeiService.listTrainings(organizationId),
      DeiService.listGoals(organizationId),
      DeiService.listMetrics(organizationId),
    ]);

    const activeInitiatives = initiatives.filter((i) => i.status === 'active').length;
    const completedTrainings = trainings.filter((t) => t.status === 'completed');
    const trainingCompletion = trainings.length > 0
      ? Math.round((completedTrainings.length / trainings.length) * 100)
      : 0;
    const achievedGoals = goals.filter((g) => g.status === 'achieved').length;
    const goalProgress = goals.length > 0 ? Math.round((achievedGoals / goals.length) * 100) : 0;

    const representationSummary: Record<string, number> = {};
    for (const m of metrics) {
      if (m.category === 'leadership_represention' || m.category === 'gender') {
        representationSummary[m.metricName] = m.value;
      }
    }

    return {
      activeInitiatives,
      trainingCompletion,
      goalProgress,
      representationSummary,
    };
  },

  // ── Stats ──

  async getDeiStats(organizationId: string): Promise<DeiStats> {
    const [initiatives, metrics, trainings, goals] = await Promise.all([
      DeiService.listInitiatives(organizationId),
      DeiService.listMetrics(organizationId),
      DeiService.listTrainings(organizationId),
      DeiService.listGoals(organizationId),
    ]);

    const byInitiativeType: Record<string, number> = {};
    const byInitiativeStatus: Record<string, number> = {};
    for (const i of initiatives) {
      byInitiativeType[i.type] = (byInitiativeType[i.type] || 0) + 1;
      byInitiativeStatus[i.status] = (byInitiativeStatus[i.status] || 0) + 1;
    }

    const byTrainingStatus: Record<string, number> = {};
    for (const t of trainings) {
      byTrainingStatus[t.status] = (byTrainingStatus[t.status] || 0) + 1;
    }

    const byGoalStatus: Record<string, number> = {};
    for (const g of goals) {
      byGoalStatus[g.status] = (byGoalStatus[g.status] || 0) + 1;
    }

    return {
      initiativeCount: initiatives.length,
      activeInitiativeCount: initiatives.filter((i) => i.status === 'active').length,
      metricCount: metrics.length,
      trainingCount: trainings.length,
      completedTrainingCount: trainings.filter((t) => t.status === 'completed').length,
      goalCount: goals.length,
      achievedGoalCount: goals.filter((g) => g.status === 'achieved').length,
      byInitiativeType,
      byInitiativeStatus,
      byTrainingStatus,
      byGoalStatus,
    };
  },
};
