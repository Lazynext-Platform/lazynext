import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ESGCategory = 'environmental' | 'social' | 'governance';
export type ESGTargetStatus = 'on_track' | 'ahead' | 'behind' | 'achieved' | 'at_risk';
export type ESGInitiativeStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type ESGReportType = 'annual' | 'quarterly' | 'monthly' | 'custom';
export type ESGReportStatus = 'draft' | 'in_review' | 'published';
export type CarbonUnit = 'tons_co2e' | 'kg_co2e';
export type ESGAssessmentFramework = 'GRI' | 'SASB' | 'TCFD' | 'CDP' | 'B_Corp' | 'custom';
export type ESGAssessmentStatus = 'pending' | 'in_progress' | 'completed';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface MetricContent {
  name: string;
  category: ESGCategory;
  unit: string;
  value: number;
  target: number;
  period: string;
  description: string;
  trend: string;
}

interface TargetContent {
  metricId: string;
  name: string;
  category: ESGCategory;
  baseline: number;
  target: number;
  targetDate: string;
  current: number;
  status: ESGTargetStatus;
  description: string;
}

interface InitiativeContent {
  name: string;
  category: ESGCategory;
  description: string;
  startDate: string;
  endDate: string;
  status: ESGInitiativeStatus;
  owner: string;
  budget: number;
  impact: string;
  sdgGoals: string[];
}

interface ReportContent {
  title: string;
  type: ESGReportType;
  period: string;
  summary: string;
  frameworks: string[];
  status: ESGReportStatus;
  publishedDate: string | null;
  publishedBy: string;
}

interface CarbonEmissionContent {
  scope: number;
  source: string;
  amount: number;
  unit: CarbonUnit;
  period: string;
  facility: string;
  offset: number;
  netEmission: number;
}

interface AssessmentContent {
  framework: ESGAssessmentFramework;
  rating: string;
  score: number;
  assessor: string;
  assessmentDate: string;
  findings: string;
  recommendations: string;
  status: ESGAssessmentStatus;
}

// ── Public interfaces ──

export interface ESGMetric {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: ESGCategory;
  unit: string;
  value: number;
  target: number;
  period: string;
  description: string;
  trend: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESGTarget {
  id: string;
  organizationId: string;
  workspaceId: string;
  metricId: string;
  name: string;
  category: ESGCategory;
  baseline: number;
  target: number;
  targetDate: string;
  current: number;
  status: ESGTargetStatus;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESGInitiative {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: ESGCategory;
  description: string;
  startDate: string;
  endDate: string;
  status: ESGInitiativeStatus;
  owner: string;
  budget: number;
  impact: string;
  sdgGoals: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESGReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ESGReportType;
  period: string;
  summary: string;
  frameworks: string[];
  status: ESGReportStatus;
  publishedDate: string | null;
  publishedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonEmission {
  id: string;
  organizationId: string;
  workspaceId: string;
  scope: number;
  source: string;
  amount: number;
  unit: CarbonUnit;
  period: string;
  facility: string;
  offset: number;
  netEmission: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ESGAssessment {
  id: string;
  organizationId: string;
  workspaceId: string;
  framework: ESGAssessmentFramework;
  rating: string;
  score: number;
  assessor: string;
  assessmentDate: string;
  findings: string;
  recommendations: string;
  status: ESGAssessmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Input / Options ──

export interface CreateMetricInput {
  name: string;
  category: ESGCategory;
  unit: string;
  value: number;
  target?: number;
  period: string;
  description?: string;
  trend?: string;
}

export interface UpdateMetricInput {
  name?: string;
  category?: ESGCategory;
  unit?: string;
  value?: number;
  target?: number;
  period?: string;
  description?: string;
  trend?: string;
}

export interface ListMetricsOpts {
  category?: ESGCategory;
  period?: string;
}

export interface CreateTargetInput {
  metricId?: string;
  name: string;
  category: ESGCategory;
  baseline: number;
  target: number;
  targetDate: string;
  current?: number;
  status?: ESGTargetStatus;
  description?: string;
}

export interface UpdateTargetInput {
  metricId?: string;
  name?: string;
  category?: ESGCategory;
  baseline?: number;
  target?: number;
  targetDate?: string;
  current?: number;
  status?: ESGTargetStatus;
  description?: string;
}

export interface ListTargetsOpts {
  category?: ESGCategory;
  status?: ESGTargetStatus;
}

export interface CreateInitiativeInput {
  name: string;
  category: ESGCategory;
  description?: string;
  startDate: string;
  endDate?: string;
  status?: ESGInitiativeStatus;
  owner?: string;
  budget?: number;
  impact?: string;
  sdgGoals?: string[];
}

export interface UpdateInitiativeInput {
  name?: string;
  category?: ESGCategory;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ESGInitiativeStatus;
  owner?: string;
  budget?: number;
  impact?: string;
  sdgGoals?: string[];
}

export interface ListInitiativesOpts {
  category?: ESGCategory;
  status?: ESGInitiativeStatus;
}

export interface CreateReportInput {
  title: string;
  type: ESGReportType;
  period: string;
  summary?: string;
  frameworks?: string[];
  status?: ESGReportStatus;
  publishedDate?: string;
}

export interface UpdateReportInput {
  title?: string;
  type?: ESGReportType;
  period?: string;
  summary?: string;
  frameworks?: string[];
  status?: ESGReportStatus;
  publishedDate?: string;
}

export interface ListReportsOpts {
  type?: ESGReportType;
  status?: ESGReportStatus;
}

export interface CreateCarbonEmissionInput {
  scope: 1 | 2 | 3;
  source: string;
  amount: number;
  unit: CarbonUnit;
  period: string;
  facility?: string;
  offset?: number;
  netEmission?: number;
}

export interface UpdateCarbonEmissionInput {
  scope?: 1 | 2 | 3;
  source?: string;
  amount?: number;
  unit?: CarbonUnit;
  period?: string;
  facility?: string;
  offset?: number;
  netEmission?: number;
}

export interface ListCarbonEmissionsOpts {
  scope?: number;
  period?: string;
}

export interface CreateAssessmentInput {
  framework: ESGAssessmentFramework;
  rating?: string;
  score?: number;
  assessor?: string;
  assessmentDate: string;
  findings?: string;
  recommendations?: string;
  status?: ESGAssessmentStatus;
}

export interface UpdateAssessmentInput {
  framework?: ESGAssessmentFramework;
  rating?: string;
  score?: number;
  assessor?: string;
  assessmentDate?: string;
  findings?: string;
  recommendations?: string;
  status?: ESGAssessmentStatus;
}

export interface ListAssessmentsOpts {
  framework?: ESGAssessmentFramework;
  status?: ESGAssessmentStatus;
}

export interface CarbonFootprint {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  totalOffset: number;
  netTotal: number;
}

export interface ESGScore {
  environmental: number;
  social: number;
  governance: number;
  overall: number;
}

export interface SustainabilityMetricsSummary {
  metricCount: number;
  targetCount: number;
  initiativeCount: number;
  targetsProgress: Array<{ name: string; progress: number; status: ESGTargetStatus }>;
  initiativesByStatus: Record<string, number>;
}

export interface SustainabilityStats {
  metricCount: number;
  targetCount: number;
  initiativeCount: number;
  reportCount: number;
  carbonEmissionCount: number;
  assessmentCount: number;
  totalEmissions: number;
  totalOffset: number;
  netEmissions: number;
}

// ── Helpers ──

const fallbackMetricContent: MetricContent = {
  name: '',
  category: 'environmental',
  unit: '',
  value: 0,
  target: 0,
  period: '',
  description: '',
  trend: '',
};

const fallbackTargetContent: TargetContent = {
  metricId: '',
  name: '',
  category: 'environmental',
  baseline: 0,
  target: 0,
  targetDate: '',
  current: 0,
  status: 'on_track',
  description: '',
};

const fallbackInitiativeContent: InitiativeContent = {
  name: '',
  category: 'environmental',
  description: '',
  startDate: '',
  endDate: '',
  status: 'planned',
  owner: '',
  budget: 0,
  impact: '',
  sdgGoals: [],
};

const fallbackReportContent: ReportContent = {
  title: '',
  type: 'annual',
  period: '',
  summary: '',
  frameworks: [],
  status: 'draft',
  publishedDate: null,
  publishedBy: '',
};

const fallbackCarbonContent: CarbonEmissionContent = {
  scope: 1,
  source: '',
  amount: 0,
  unit: 'tons_co2e',
  period: '',
  facility: '',
  offset: 0,
  netEmission: 0,
};

const fallbackAssessmentContent: AssessmentContent = {
  framework: 'GRI',
  rating: '',
  score: 0,
  assessor: '',
  assessmentDate: '',
  findings: '',
  recommendations: '',
  status: 'pending',
};

function parseMetricContent(raw: string): MetricContent {
  if (!raw) return fallbackMetricContent;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      category: (p.category as ESGCategory) ?? 'environmental',
      unit: p.unit ?? '',
      value: Number(p.value) || 0,
      target: Number(p.target) || 0,
      period: p.period ?? '',
      description: p.description ?? '',
      trend: p.trend ?? '',
    };
  } catch {
    return fallbackMetricContent;
  }
}

function parseTargetContent(raw: string): TargetContent {
  if (!raw) return fallbackTargetContent;
  try {
    const p = JSON.parse(raw);
    return {
      metricId: p.metricId ?? '',
      name: p.name ?? '',
      category: (p.category as ESGCategory) ?? 'environmental',
      baseline: Number(p.baseline) || 0,
      target: Number(p.target) || 0,
      targetDate: p.targetDate ?? '',
      current: Number(p.current) || 0,
      status: (p.status as ESGTargetStatus) ?? 'on_track',
      description: p.description ?? '',
    };
  } catch {
    return fallbackTargetContent;
  }
}

function parseInitiativeContent(raw: string): InitiativeContent {
  if (!raw) return fallbackInitiativeContent;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      category: (p.category as ESGCategory) ?? 'environmental',
      description: p.description ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      status: (p.status as ESGInitiativeStatus) ?? 'planned',
      owner: p.owner ?? '',
      budget: Number(p.budget) || 0,
      impact: p.impact ?? '',
      sdgGoals: Array.isArray(p.sdgGoals) ? p.sdgGoals : [],
    };
  } catch {
    return fallbackInitiativeContent;
  }
}

function parseReportContent(raw: string): ReportContent {
  if (!raw) return fallbackReportContent;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      type: (p.type as ESGReportType) ?? 'annual',
      period: p.period ?? '',
      summary: p.summary ?? '',
      frameworks: Array.isArray(p.frameworks) ? p.frameworks : [],
      status: (p.status as ESGReportStatus) ?? 'draft',
      publishedDate: p.publishedDate ?? null,
      publishedBy: p.publishedBy ?? '',
    };
  } catch {
    return fallbackReportContent;
  }
}

function parseCarbonContent(raw: string): CarbonEmissionContent {
  if (!raw) return fallbackCarbonContent;
  try {
    const p = JSON.parse(raw);
    return {
      scope: Number(p.scope) || 1,
      source: p.source ?? '',
      amount: Number(p.amount) || 0,
      unit: (p.unit as CarbonUnit) ?? 'tons_co2e',
      period: p.period ?? '',
      facility: p.facility ?? '',
      offset: Number(p.offset) || 0,
      netEmission: Number(p.netEmission) || 0,
    };
  } catch {
    return fallbackCarbonContent;
  }
}

function parseAssessmentContent(raw: string): AssessmentContent {
  if (!raw) return fallbackAssessmentContent;
  try {
    const p = JSON.parse(raw);
    return {
      framework: (p.framework as ESGAssessmentFramework) ?? 'GRI',
      rating: p.rating ?? '',
      score: Number(p.score) || 0,
      assessor: p.assessor ?? '',
      assessmentDate: p.assessmentDate ?? '',
      findings: p.findings ?? '',
      recommendations: p.recommendations ?? '',
      status: (p.status as ESGAssessmentStatus) ?? 'pending',
    };
  } catch {
    return fallbackAssessmentContent;
  }
}

function toMetric(row: MemoryRow): ESGMetric {
  const c = parseMetricContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    category: c.category,
    unit: c.unit,
    value: c.value,
    target: c.target,
    period: c.period,
    description: c.description,
    trend: c.trend,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTarget(row: MemoryRow): ESGTarget {
  const c = parseTargetContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    metricId: c.metricId,
    name: c.name,
    category: c.category,
    baseline: c.baseline,
    target: c.target,
    targetDate: c.targetDate,
    current: c.current,
    status: c.status,
    description: c.description,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInitiative(row: MemoryRow): ESGInitiative {
  const c = parseInitiativeContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    category: c.category,
    description: c.description,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    owner: c.owner,
    budget: c.budget,
    impact: c.impact,
    sdgGoals: c.sdgGoals,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toReport(row: MemoryRow): ESGReport {
  const c = parseReportContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: c.title,
    type: c.type,
    period: c.period,
    summary: c.summary,
    frameworks: c.frameworks,
    status: c.status,
    publishedDate: c.publishedDate,
    publishedBy: c.publishedBy,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCarbonEmission(row: MemoryRow): CarbonEmission {
  const c = parseCarbonContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    scope: c.scope,
    source: c.source,
    amount: c.amount,
    unit: c.unit,
    period: c.period,
    facility: c.facility,
    offset: c.offset,
    netEmission: c.netEmission,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAssessment(row: MemoryRow): ESGAssessment {
  const c = parseAssessmentContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    framework: c.framework,
    rating: c.rating,
    score: c.score,
    assessor: c.assessor,
    assessmentDate: c.assessmentDate,
    findings: c.findings,
    recommendations: c.recommendations,
    status: c.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Sustainability Service ──

export const SustainabilityService = {
  // ── Metrics ──

  async createMetric(
    organizationId: string,
    workspaceId: string,
    input: CreateMetricInput,
    createdBy: string,
  ): Promise<ESGMetric> {
    const content: MetricContent = {
      name: input.name,
      category: input.category,
      unit: input.unit,
      value: input.value,
      target: input.target ?? 0,
      period: input.period,
      description: input.description ?? '',
      trend: input.trend ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esg_metric',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['esg_metric', content.category]),
        createdBy,
      },
    });

    return toMetric(row as MemoryRow);
  },

  async getMetric(id: string): Promise<ESGMetric | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toMetric(row as MemoryRow);
  },

  async listMetrics(
    organizationId: string,
    opts: ListMetricsOpts = {},
  ): Promise<ESGMetric[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'esg_metric', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let metrics = rows.map((r) => toMetric(r as MemoryRow));
    if (opts.category) {
      metrics = metrics.filter((m) => m.category === opts.category);
    }
    if (opts.period) {
      metrics = metrics.filter((m) => m.period === opts.period);
    }
    return metrics;
  },

  async updateMetric(
    id: string,
    input: UpdateMetricInput,
  ): Promise<ESGMetric | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseMetricContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.category !== undefined) content.category = input.category;
    if (input.unit !== undefined) content.unit = input.unit;
    if (input.value !== undefined) content.value = input.value;
    if (input.target !== undefined) content.target = input.target;
    if (input.period !== undefined) content.period = input.period;
    if (input.description !== undefined) content.description = input.description;
    if (input.trend !== undefined) content.trend = input.trend;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_metric', content.category]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toMetric(row as MemoryRow);
  },

  async deleteMetric(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Targets ──

  async createTarget(
    organizationId: string,
    workspaceId: string,
    input: CreateTargetInput,
    createdBy: string,
  ): Promise<ESGTarget> {
    const content: TargetContent = {
      metricId: input.metricId ?? '',
      name: input.name,
      category: input.category,
      baseline: input.baseline,
      target: input.target,
      targetDate: input.targetDate,
      current: input.current ?? input.baseline,
      status: input.status ?? 'on_track',
      description: input.description ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esg_target',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.metricId ?? null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['esg_target', content.category, content.status]),
        createdBy,
      },
    });

    return toTarget(row as MemoryRow);
  },

  async getTarget(id: string): Promise<ESGTarget | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toTarget(row as MemoryRow);
  },

  async listTargets(
    organizationId: string,
    opts: ListTargetsOpts = {},
  ): Promise<ESGTarget[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'esg_target', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let targets = rows.map((r) => toTarget(r as MemoryRow));
    if (opts.category) {
      targets = targets.filter((t) => t.category === opts.category);
    }
    if (opts.status) {
      targets = targets.filter((t) => t.status === opts.status);
    }
    return targets;
  },

  async updateTarget(
    id: string,
    input: UpdateTargetInput,
  ): Promise<ESGTarget | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseTargetContent(existing.content);
    if (input.metricId !== undefined) content.metricId = input.metricId;
    if (input.name !== undefined) content.name = input.name;
    if (input.category !== undefined) content.category = input.category;
    if (input.baseline !== undefined) content.baseline = input.baseline;
    if (input.target !== undefined) content.target = input.target;
    if (input.targetDate !== undefined) content.targetDate = input.targetDate;
    if (input.current !== undefined) content.current = input.current;
    if (input.status !== undefined) content.status = input.status;
    if (input.description !== undefined) content.description = input.description;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_target', content.category, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toTarget(row as MemoryRow);
  },

  async deleteTarget(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Initiatives ──

  async createInitiative(
    organizationId: string,
    workspaceId: string,
    input: CreateInitiativeInput,
    createdBy: string,
  ): Promise<ESGInitiative> {
    const content: InitiativeContent = {
      name: input.name,
      category: input.category,
      description: input.description ?? '',
      startDate: input.startDate,
      endDate: input.endDate ?? '',
      status: input.status ?? 'planned',
      owner: input.owner ?? '',
      budget: input.budget ?? 0,
      impact: input.impact ?? '',
      sdgGoals: input.sdgGoals ?? [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esg_initiative',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['esg_initiative', content.category, content.status]),
        createdBy,
      },
    });

    return toInitiative(row as MemoryRow);
  },

  async getInitiative(id: string): Promise<ESGInitiative | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toInitiative(row as MemoryRow);
  },

  async listInitiatives(
    organizationId: string,
    opts: ListInitiativesOpts = {},
  ): Promise<ESGInitiative[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'esg_initiative', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let initiatives = rows.map((r) => toInitiative(r as MemoryRow));
    if (opts.category) {
      initiatives = initiatives.filter((i) => i.category === opts.category);
    }
    if (opts.status) {
      initiatives = initiatives.filter((i) => i.status === opts.status);
    }
    return initiatives;
  },

  async updateInitiative(
    id: string,
    input: UpdateInitiativeInput,
  ): Promise<ESGInitiative | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseInitiativeContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.category !== undefined) content.category = input.category;
    if (input.description !== undefined) content.description = input.description;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.impact !== undefined) content.impact = input.impact;
    if (input.sdgGoals !== undefined) content.sdgGoals = input.sdgGoals;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_initiative', content.category, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toInitiative(row as MemoryRow);
  },

  async deleteInitiative(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Reports ──

  async createReport(
    organizationId: string,
    workspaceId: string,
    input: CreateReportInput,
    createdBy: string,
  ): Promise<ESGReport> {
    const content: ReportContent = {
      title: input.title,
      type: input.type,
      period: input.period,
      summary: input.summary ?? '',
      frameworks: input.frameworks ?? [],
      status: input.status ?? 'draft',
      publishedDate: input.publishedDate ?? null,
      publishedBy: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esg_report',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['esg_report', content.type, content.status]),
        createdBy,
      },
    });

    return toReport(row as MemoryRow);
  },

  async getReport(id: string): Promise<ESGReport | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  async listReports(
    organizationId: string,
    opts: ListReportsOpts = {},
  ): Promise<ESGReport[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'esg_report', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let reports = rows.map((r) => toReport(r as MemoryRow));
    if (opts.type) {
      reports = reports.filter((r) => r.type === opts.type);
    }
    if (opts.status) {
      reports = reports.filter((r) => r.status === opts.status);
    }
    return reports;
  },

  async updateReport(
    id: string,
    input: UpdateReportInput,
  ): Promise<ESGReport | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseReportContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.type !== undefined) content.type = input.type;
    if (input.period !== undefined) content.period = input.period;
    if (input.summary !== undefined) content.summary = input.summary;
    if (input.frameworks !== undefined) content.frameworks = input.frameworks;
    if (input.status !== undefined) content.status = input.status;
    if (input.publishedDate !== undefined) content.publishedDate = input.publishedDate;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_report', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  async publishReport(
    id: string,
    publishedBy: string,
  ): Promise<ESGReport | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseReportContent(existing.content);
    content.status = 'published';
    content.publishedDate = new Date().toISOString();
    content.publishedBy = publishedBy;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_report', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toReport(row as MemoryRow);
  },

  // ── Carbon Emissions ──

  async createCarbonEmission(
    organizationId: string,
    workspaceId: string,
    input: CreateCarbonEmissionInput,
    createdBy: string,
  ): Promise<CarbonEmission> {
    const offset = input.offset ?? 0;
    const netEmission = input.netEmission !== undefined ? input.netEmission : input.amount - offset;

    const content: CarbonEmissionContent = {
      scope: input.scope,
      source: input.source,
      amount: input.amount,
      unit: input.unit,
      period: input.period,
      facility: input.facility ?? '',
      offset,
      netEmission,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'carbon_emission',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['carbon_emission', `scope_${input.scope}`]),
        createdBy,
      },
    });

    return toCarbonEmission(row as MemoryRow);
  },

  async getCarbonEmission(id: string): Promise<CarbonEmission | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCarbonEmission(row as MemoryRow);
  },

  async listCarbonEmissions(
    organizationId: string,
    opts: ListCarbonEmissionsOpts = {},
  ): Promise<CarbonEmission[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'carbon_emission', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let emissions = rows.map((r) => toCarbonEmission(r as MemoryRow));
    if (opts.scope !== undefined) {
      emissions = emissions.filter((e) => e.scope === opts.scope);
    }
    if (opts.period) {
      emissions = emissions.filter((e) => e.period === opts.period);
    }
    return emissions;
  },

  async updateCarbonEmission(
    id: string,
    input: UpdateCarbonEmissionInput,
  ): Promise<CarbonEmission | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCarbonContent(existing.content);
    if (input.scope !== undefined) content.scope = input.scope;
    if (input.source !== undefined) content.source = input.source;
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.unit !== undefined) content.unit = input.unit;
    if (input.period !== undefined) content.period = input.period;
    if (input.facility !== undefined) content.facility = input.facility;
    if (input.offset !== undefined) content.offset = input.offset;
    if (input.netEmission !== undefined) {
      content.netEmission = input.netEmission;
    } else if (input.amount !== undefined || input.offset !== undefined) {
      content.netEmission = content.amount - content.offset;
    }

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['carbon_emission', `scope_${content.scope}`]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCarbonEmission(row as MemoryRow);
  },

  async deleteCarbonEmission(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Assessments ──

  async createAssessment(
    organizationId: string,
    workspaceId: string,
    input: CreateAssessmentInput,
    createdBy: string,
  ): Promise<ESGAssessment> {
    const content: AssessmentContent = {
      framework: input.framework,
      rating: input.rating ?? '',
      score: input.score ?? 0,
      assessor: input.assessor ?? '',
      assessmentDate: input.assessmentDate,
      findings: input.findings ?? '',
      recommendations: input.recommendations ?? '',
      status: input.status ?? 'pending',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'esg_assessment',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['esg_assessment', content.framework, content.status]),
        createdBy,
      },
    });

    return toAssessment(row as MemoryRow);
  },

  async getAssessment(id: string): Promise<ESGAssessment | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toAssessment(row as MemoryRow);
  },

  async listAssessments(
    organizationId: string,
    opts: ListAssessmentsOpts = {},
  ): Promise<ESGAssessment[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'esg_assessment', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let assessments = rows.map((r) => toAssessment(r as MemoryRow));
    if (opts.framework) {
      assessments = assessments.filter((a) => a.framework === opts.framework);
    }
    if (opts.status) {
      assessments = assessments.filter((a) => a.status === opts.status);
    }
    return assessments;
  },

  async updateAssessment(
    id: string,
    input: UpdateAssessmentInput,
  ): Promise<ESGAssessment | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseAssessmentContent(existing.content);
    if (input.framework !== undefined) content.framework = input.framework;
    if (input.rating !== undefined) content.rating = input.rating;
    if (input.score !== undefined) content.score = input.score;
    if (input.assessor !== undefined) content.assessor = input.assessor;
    if (input.assessmentDate !== undefined) content.assessmentDate = input.assessmentDate;
    if (input.findings !== undefined) content.findings = input.findings;
    if (input.recommendations !== undefined) content.recommendations = input.recommendations;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['esg_assessment', content.framework, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toAssessment(row as MemoryRow);
  },

  // ── Analytics ──

  async getCarbonFootprint(
    organizationId: string,
    opts: { period?: string } = {},
  ): Promise<CarbonFootprint> {
    const emissions = await this.listCarbonEmissions(organizationId, opts);

    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    let totalOffset = 0;

    for (const e of emissions) {
      // Normalize kg to tons for aggregation
      const normalized = e.unit === 'kg_co2e' ? e.amount / 1000 : e.amount;
      const offsetNorm = e.unit === 'kg_co2e' ? e.offset / 1000 : e.offset;
      if (e.scope === 1) scope1 += normalized;
      else if (e.scope === 2) scope2 += normalized;
      else if (e.scope === 3) scope3 += normalized;
      totalOffset += offsetNorm;
    }

    const total = scope1 + scope2 + scope3;
    return {
      scope1,
      scope2,
      scope3,
      total,
      totalOffset,
      netTotal: total - totalOffset,
    };
  },

  async getESGScore(organizationId: string): Promise<ESGScore> {
    const [metrics, assessments] = await Promise.all([
      this.listMetrics(organizationId),
      this.listAssessments(organizationId),
    ]);

    // Aggregate metric values by category (average of normalized values)
    const categoryScores: Record<ESGCategory, { sum: number; count: number }> = {
      environmental: { sum: 0, count: 0 },
      social: { sum: 0, count: 0 },
      governance: { sum: 0, count: 0 },
    };

    for (const m of metrics) {
      // Normalize: if target > 0, score = (value / target) * 100 capped at 100
      const score = m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0;
      categoryScores[m.category].sum += score;
      categoryScores[m.category].count += 1;
    }

    // Blend with assessment scores if available
    const completedAssessments = assessments.filter((a) => a.status === 'completed' && a.score > 0);
    if (completedAssessments.length > 0) {
      const avgScore = completedAssessments.reduce((s, a) => s + a.score, 0) / completedAssessments.length;
      // Use assessment score as overall anchor
      const envAvg = categoryScores.environmental.count > 0
        ? categoryScores.environmental.sum / categoryScores.environmental.count : avgScore;
      const socAvg = categoryScores.social.count > 0
        ? categoryScores.social.sum / categoryScores.social.count : avgScore;
      const govAvg = categoryScores.governance.count > 0
        ? categoryScores.governance.sum / categoryScores.governance.count : avgScore;
      const overall = (envAvg + socAvg + govAvg) / 3;
      return {
        environmental: Math.round(envAvg * 10) / 10,
        social: Math.round(socAvg * 10) / 10,
        governance: Math.round(govAvg * 10) / 10,
        overall: Math.round(overall * 10) / 10,
      };
    }

    const environmental = categoryScores.environmental.count > 0
      ? categoryScores.environmental.sum / categoryScores.environmental.count : 0;
    const social = categoryScores.social.count > 0
      ? categoryScores.social.sum / categoryScores.social.count : 0;
    const governance = categoryScores.governance.count > 0
      ? categoryScores.governance.sum / categoryScores.governance.count : 0;
    const overall = (environmental + social + governance) / 3;

    return {
      environmental: Math.round(environmental * 10) / 10,
      social: Math.round(social * 10) / 10,
      governance: Math.round(governance * 10) / 10,
      overall: Math.round(overall * 10) / 10,
    };
  },

  async getSustainabilityMetrics(
    organizationId: string,
  ): Promise<SustainabilityMetricsSummary> {
    const [metrics, targets, initiatives] = await Promise.all([
      this.listMetrics(organizationId),
      this.listTargets(organizationId),
      this.listInitiatives(organizationId),
    ]);

    const targetsProgress = targets.map((t) => {
      const range = t.target - t.baseline;
      const progress = range !== 0
        ? Math.min(Math.max(((t.current - t.baseline) / range) * 100, 0), 100)
        : 100;
      return { name: t.name, progress: Math.round(progress * 10) / 10, status: t.status };
    });

    const initiativesByStatus: Record<string, number> = {};
    for (const i of initiatives) {
      initiativesByStatus[i.status] = (initiativesByStatus[i.status] ?? 0) + 1;
    }

    return {
      metricCount: metrics.length,
      targetCount: targets.length,
      initiativeCount: initiatives.length,
      targetsProgress,
      initiativesByStatus,
    };
  },

  async getStats(organizationId: string): Promise<SustainabilityStats> {
    const [metrics, targets, initiatives, reports, emissions, assessments] = await Promise.all([
      this.listMetrics(organizationId),
      this.listTargets(organizationId),
      this.listInitiatives(organizationId),
      this.listReports(organizationId),
      this.listCarbonEmissions(organizationId),
      this.listAssessments(organizationId),
    ]);

    const totalEmissions = emissions.reduce((s, e) => {
      const normalized = e.unit === 'kg_co2e' ? e.amount / 1000 : e.amount;
      return s + normalized;
    }, 0);
    const totalOffset = emissions.reduce((s, e) => {
      const normalized = e.unit === 'kg_co2e' ? e.offset / 1000 : e.offset;
      return s + normalized;
    }, 0);

    return {
      metricCount: metrics.length,
      targetCount: targets.length,
      initiativeCount: initiatives.length,
      reportCount: reports.length,
      carbonEmissionCount: emissions.length,
      assessmentCount: assessments.length,
      totalEmissions,
      totalOffset,
      netEmissions: totalEmissions - totalOffset,
    };
  },
};
