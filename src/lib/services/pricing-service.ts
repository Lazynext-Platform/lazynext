import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PricingModelType = 'subscription' | 'usage_based' | 'tiered' | 'freemium' | 'per_seat' | 'one_time' | 'hybrid' | 'value_based';
export type PricingModelStatus = 'active' | 'inactive' | 'archived' | 'draft';
export type BillingPeriod = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type TierStatus = 'active' | 'inactive' | 'archived';
export type ExperimentStatus = 'planned' | 'running' | 'completed' | 'cancelled' | 'paused';
export type DiscountType = 'percentage' | 'fixed' | 'volume' | 'loyalty' | 'promotional' | 'partner';
export type DiscountStatus = 'active' | 'inactive' | 'expired' | 'archived';
export type RevenueStreamType = 'recurring' | 'one_time' | 'usage' | 'service' | 'licensing' | 'transaction' | 'advertising' | 'other';
export type RevenueStreamStatus = 'active' | 'inactive' | 'paused' | 'discontinued';

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

interface PricingModelContent {
  name: string;
  type: PricingModelType;
  description: string;
  currency: string;
  status: PricingModelStatus;
  effectiveDate: string | null;
  version: string;
}

interface PricingTierContent {
  modelId: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  limits: Array<{ name: string; value: string; unit: string }>;
  targetSegment: string;
  status: TierStatus;
  sortOrder: number;
}

interface ExperimentVariant {
  name: string;
  price: number;
  description: string;
  weight: number;
}

interface PriceExperimentContent {
  name: string;
  description: string;
  modelId: string | null;
  variants: ExperimentVariant[];
  startDate: string;
  endDate: string | null;
  status: ExperimentStatus;
  targetSegment: string;
  successMetric: string;
  results: string;
  startedBy: string;
  startedAt: string | null;
  endedBy: string;
  endedAt: string | null;
}

interface DiscountRuleContent {
  name: string;
  type: DiscountType;
  value: number;
  conditions: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  validFrom: string | null;
  validTo: string | null;
  appliesTo: string;
  stackable: boolean;
  status: DiscountStatus;
  usageLimit: number | null;
  usageCount: number;
}

interface RevenueStreamContent {
  name: string;
  type: RevenueStreamType;
  description: string;
  pricingModelId: string | null;
  currentMrr: number;
  projectedMrr: number;
  growthRate: number;
  status: RevenueStreamStatus;
  startDate: string | null;
}

// ── Public interfaces ──

export interface PricingModel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PricingModelType;
  description: string;
  currency: string;
  status: PricingModelStatus;
  effectiveDate: Date | null;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingTier {
  id: string;
  organizationId: string;
  workspaceId: string;
  modelId: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  limits: Array<{ name: string; value: string; unit: string }>;
  targetSegment: string;
  status: TierStatus;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceExperiment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  modelId: string | null;
  variants: ExperimentVariant[];
  startDate: Date;
  endDate: Date | null;
  status: ExperimentStatus;
  targetSegment: string;
  successMetric: string;
  results: string;
  startedBy: string;
  startedAt: Date | null;
  endedBy: string;
  endedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscountRule {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: DiscountType;
  value: number;
  conditions: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  validFrom: Date | null;
  validTo: Date | null;
  appliesTo: string;
  stackable: boolean;
  status: DiscountStatus;
  usageLimit: number | null;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueStream {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RevenueStreamType;
  description: string;
  pricingModelId: string | null;
  currentMrr: number;
  projectedMrr: number;
  growthRate: number;
  status: RevenueStreamStatus;
  startDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingMetrics {
  totalMrr: number;
  projectedMrr: number;
  revenueByStream: Array<{ name: string; type: RevenueStreamType; currentMrr: number; projectedMrr: number }>;
  activeExperiments: number;
  discountUtilization: number;
  pricingModelCoverage: number;
}

export interface PricingStats {
  modelCount: number;
  activeModelCount: number;
  tierCount: number;
  experimentCount: number;
  runningExperimentCount: number;
  discountCount: number;
  activeDiscountCount: number;
  revenueStreamCount: number;
  activeRevenueStreamCount: number;
  totalMrr: number;
  projectedMrr: number;
  byModelType: Record<string, number>;
  byDiscountType: Record<string, number>;
  byRevenueStreamType: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePricingModelInput {
  name: string;
  type: PricingModelType;
  description?: string;
  currency?: string;
  status?: PricingModelStatus;
  effectiveDate?: string;
  version?: string;
}

export interface UpdatePricingModelInput {
  name?: string;
  type?: PricingModelType;
  description?: string;
  currency?: string;
  status?: PricingModelStatus;
  effectiveDate?: string;
  version?: string;
}

export interface ListPricingModelsOpts {
  type?: PricingModelType;
  status?: PricingModelStatus;
}

export interface CreatePricingTierInput {
  modelId: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  limits?: Array<{ name: string; value: string; unit: string }>;
  targetSegment?: string;
  status?: TierStatus;
  sortOrder?: number;
}

export interface UpdatePricingTierInput {
  name?: string;
  price?: number;
  billingPeriod?: BillingPeriod;
  features?: string[];
  limits?: Array<{ name: string; value: string; unit: string }>;
  targetSegment?: string;
  status?: TierStatus;
  sortOrder?: number;
}

export interface ListPricingTiersOpts {
  modelId?: string;
  status?: TierStatus;
}

export interface CreatePriceExperimentInput {
  name: string;
  description?: string;
  modelId?: string;
  variants: Array<{ name: string; price: number; description?: string; weight?: number }>;
  startDate: string;
  endDate?: string;
  status?: ExperimentStatus;
  targetSegment?: string;
  successMetric?: string;
  results?: string;
}

export interface UpdatePriceExperimentInput {
  name?: string;
  description?: string;
  modelId?: string;
  variants?: Array<{ name: string; price: number; description?: string; weight?: number }>;
  startDate?: string;
  endDate?: string;
  status?: ExperimentStatus;
  targetSegment?: string;
  successMetric?: string;
  results?: string;
}

export interface ListPriceExperimentsOpts {
  status?: ExperimentStatus;
  modelId?: string;
}

export interface CreateDiscountRuleInput {
  name: string;
  type: DiscountType;
  value: number;
  conditions?: string;
  minQuantity?: number;
  maxQuantity?: number;
  validFrom?: string;
  validTo?: string;
  appliesTo?: string;
  stackable?: boolean;
  status?: DiscountStatus;
  usageLimit?: number;
  usageCount?: number;
}

export interface UpdateDiscountRuleInput {
  name?: string;
  type?: DiscountType;
  value?: number;
  conditions?: string;
  minQuantity?: number;
  maxQuantity?: number;
  validFrom?: string;
  validTo?: string;
  appliesTo?: string;
  stackable?: boolean;
  status?: DiscountStatus;
  usageLimit?: number;
  usageCount?: number;
}

export interface ListDiscountRulesOpts {
  type?: DiscountType;
  status?: DiscountStatus;
}

export interface CreateRevenueStreamInput {
  name: string;
  type: RevenueStreamType;
  description?: string;
  pricingModelId?: string;
  currentMrr?: number;
  projectedMrr?: number;
  growthRate?: number;
  status?: RevenueStreamStatus;
  startDate?: string;
}

export interface UpdateRevenueStreamInput {
  name?: string;
  type?: RevenueStreamType;
  description?: string;
  pricingModelId?: string;
  currentMrr?: number;
  projectedMrr?: number;
  growthRate?: number;
  status?: RevenueStreamStatus;
  startDate?: string;
}

export interface ListRevenueStreamsOpts {
  type?: RevenueStreamType;
  status?: RevenueStreamStatus;
}

// ── Helpers ──

const fallbackModel: PricingModelContent = {
  name: '', type: 'subscription', description: '', currency: 'USD', status: 'active', effectiveDate: null, version: '1.0',
};

const fallbackTier: PricingTierContent = {
  modelId: '', name: '', price: 0, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0,
};

const fallbackExperiment: PriceExperimentContent = {
  name: '', description: '', modelId: null, variants: [], startDate: '', endDate: null, status: 'planned', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null,
};

const fallbackDiscount: DiscountRuleContent = {
  name: '', type: 'percentage', value: 0, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: null, usageCount: 0,
};

const fallbackStream: RevenueStreamContent = {
  name: '', type: 'recurring', description: '', pricingModelId: null, currentMrr: 0, projectedMrr: 0, growthRate: 0, status: 'active', startDate: null,
};

function parseModel(raw: string): PricingModelContent {
  if (!raw) return fallbackModel;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as PricingModelType) ?? 'subscription',
      description: p.description ?? '',
      currency: p.currency ?? 'USD',
      status: (p.status as PricingModelStatus) ?? 'active',
      effectiveDate: p.effectiveDate ?? null,
      version: p.version ?? '1.0',
    };
  } catch { return fallbackModel; }
}

function parseTier(raw: string): PricingTierContent {
  if (!raw) return fallbackTier;
  try {
    const p = JSON.parse(raw);
    return {
      modelId: p.modelId ?? '',
      name: p.name ?? '',
      price: p.price ?? 0,
      billingPeriod: (p.billingPeriod as BillingPeriod) ?? 'monthly',
      features: Array.isArray(p.features) ? p.features : [],
      limits: Array.isArray(p.limits) ? p.limits : [],
      targetSegment: p.targetSegment ?? '',
      status: (p.status as TierStatus) ?? 'active',
      sortOrder: p.sortOrder ?? 0,
    };
  } catch { return fallbackTier; }
}

function parseExperiment(raw: string): PriceExperimentContent {
  if (!raw) return fallbackExperiment;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      description: p.description ?? '',
      modelId: p.modelId ?? null,
      variants: Array.isArray(p.variants) ? p.variants : [],
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? null,
      status: (p.status as ExperimentStatus) ?? 'planned',
      targetSegment: p.targetSegment ?? '',
      successMetric: p.successMetric ?? '',
      results: p.results ?? '',
      startedBy: p.startedBy ?? '',
      startedAt: p.startedAt ?? null,
      endedBy: p.endedBy ?? '',
      endedAt: p.endedAt ?? null,
    };
  } catch { return fallbackExperiment; }
}

function parseDiscount(raw: string): DiscountRuleContent {
  if (!raw) return fallbackDiscount;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as DiscountType) ?? 'percentage',
      value: p.value ?? 0,
      conditions: p.conditions ?? '',
      minQuantity: p.minQuantity ?? null,
      maxQuantity: p.maxQuantity ?? null,
      validFrom: p.validFrom ?? null,
      validTo: p.validTo ?? null,
      appliesTo: p.appliesTo ?? '',
      stackable: p.stackable ?? false,
      status: (p.status as DiscountStatus) ?? 'active',
      usageLimit: p.usageLimit ?? null,
      usageCount: p.usageCount ?? 0,
    };
  } catch { return fallbackDiscount; }
}

function parseStream(raw: string): RevenueStreamContent {
  if (!raw) return fallbackStream;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      type: (p.type as RevenueStreamType) ?? 'recurring',
      description: p.description ?? '',
      pricingModelId: p.pricingModelId ?? null,
      currentMrr: p.currentMrr ?? 0,
      projectedMrr: p.projectedMrr ?? 0,
      growthRate: p.growthRate ?? 0,
      status: (p.status as RevenueStreamStatus) ?? 'active',
      startDate: p.startDate ?? null,
    };
  } catch { return fallbackStream; }
}

function toModel(row: MemoryRow): PricingModel {
  const c = parseModel(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, description: c.description, currency: c.currency,
    status: c.status, effectiveDate: c.effectiveDate ? new Date(c.effectiveDate) : null,
    version: c.version,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTier(row: MemoryRow): PricingTier {
  const c = parseTier(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    modelId: c.modelId, name: c.name, price: c.price, billingPeriod: c.billingPeriod,
    features: c.features, limits: c.limits, targetSegment: c.targetSegment,
    status: c.status, sortOrder: c.sortOrder,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toExperiment(row: MemoryRow): PriceExperiment {
  const c = parseExperiment(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, description: c.description, modelId: c.modelId, variants: c.variants,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    status: c.status, targetSegment: c.targetSegment, successMetric: c.successMetric,
    results: c.results, startedBy: c.startedBy,
    startedAt: c.startedAt ? new Date(c.startedAt) : null,
    endedBy: c.endedBy, endedAt: c.endedAt ? new Date(c.endedAt) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toDiscount(row: MemoryRow): DiscountRule {
  const c = parseDiscount(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, value: c.value, conditions: c.conditions,
    minQuantity: c.minQuantity, maxQuantity: c.maxQuantity,
    validFrom: c.validFrom ? new Date(c.validFrom) : null,
    validTo: c.validTo ? new Date(c.validTo) : null,
    appliesTo: c.appliesTo, stackable: c.stackable, status: c.status,
    usageLimit: c.usageLimit, usageCount: c.usageCount,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toStream(row: MemoryRow): RevenueStream {
  const c = parseStream(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, type: c.type, description: c.description, pricingModelId: c.pricingModelId,
    currentMrr: c.currentMrr, projectedMrr: c.projectedMrr, growthRate: c.growthRate,
    status: c.status, startDate: c.startDate ? new Date(c.startDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Pricing Service ──

export const PricingService = {
  // ── Pricing Models ──

  async createModel(
    organizationId: string,
    workspaceId: string,
    input: CreatePricingModelInput,
    createdBy: string,
  ): Promise<PricingModel> {
    const content: PricingModelContent = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      currency: input.currency ?? 'USD',
      status: input.status ?? 'active',
      effectiveDate: input.effectiveDate ?? null,
      version: input.version ?? '1.0',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pricing_model',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pricing_model', content.type, content.status]),
        createdBy,
      },
    });

    return toModel(row as MemoryRow);
  },

  async getModel(id: string): Promise<PricingModel | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pricing_model') return null;
    return toModel(row as MemoryRow);
  },

  async listModels(organizationId: string, opts: ListPricingModelsOpts = {}): Promise<PricingModel[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pricing_model', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toModel(r as MemoryRow));
    if (opts.type) records = records.filter((m) => m.type === opts.type);
    if (opts.status) records = records.filter((m) => m.status === opts.status);
    return records;
  },

  async updateModel(id: string, input: UpdatePricingModelInput): Promise<PricingModel | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseModel(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.status !== undefined) content.status = input.status;
    if (input.effectiveDate !== undefined) content.effectiveDate = input.effectiveDate;
    if (input.version !== undefined) content.version = input.version;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pricing_model', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toModel(row as MemoryRow);
  },

  async deleteModel(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Pricing Tiers ──

  async createTier(
    organizationId: string,
    workspaceId: string,
    input: CreatePricingTierInput,
    createdBy: string,
  ): Promise<PricingTier> {
    const content: PricingTierContent = {
      modelId: input.modelId,
      name: input.name.trim(),
      price: input.price,
      billingPeriod: input.billingPeriod,
      features: input.features ?? [],
      limits: input.limits ?? [],
      targetSegment: input.targetSegment ?? '',
      status: input.status ?? 'active',
      sortOrder: input.sortOrder ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'pricing_tier',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.modelId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['pricing_tier', content.status, content.billingPeriod]),
        createdBy,
      },
    });

    return toTier(row as MemoryRow);
  },

  async getTier(id: string): Promise<PricingTier | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'pricing_tier') return null;
    return toTier(row as MemoryRow);
  },

  async listTiers(organizationId: string, opts: ListPricingTiersOpts = {}): Promise<PricingTier[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'pricing_tier', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTier(r as MemoryRow));
    if (opts.modelId) records = records.filter((t) => t.modelId === opts.modelId);
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    return records.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async updateTier(id: string, input: UpdatePricingTierInput): Promise<PricingTier | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTier(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.price !== undefined) content.price = input.price;
    if (input.billingPeriod !== undefined) content.billingPeriod = input.billingPeriod;
    if (input.features !== undefined) content.features = input.features;
    if (input.limits !== undefined) content.limits = input.limits;
    if (input.targetSegment !== undefined) content.targetSegment = input.targetSegment;
    if (input.status !== undefined) content.status = input.status;
    if (input.sortOrder !== undefined) content.sortOrder = input.sortOrder;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['pricing_tier', content.status, content.billingPeriod]),
        },
      }), null,
    );
    if (!row) return null;
    return toTier(row as MemoryRow);
  },

  async deleteTier(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Price Experiments ──

  async createExperiment(
    organizationId: string,
    workspaceId: string,
    input: CreatePriceExperimentInput,
    createdBy: string,
  ): Promise<PriceExperiment> {
    const content: PriceExperimentContent = {
      name: input.name.trim(),
      description: input.description ?? '',
      modelId: input.modelId ?? null,
      variants: input.variants.map((v) => ({
        name: v.name, price: v.price, description: v.description ?? '', weight: v.weight ?? 1,
      })),
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      status: input.status ?? 'planned',
      targetSegment: input.targetSegment ?? '',
      successMetric: input.successMetric ?? '',
      results: input.results ?? '',
      startedBy: '', startedAt: null, endedBy: '', endedAt: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'price_experiment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.modelId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['price_experiment', content.status]),
        createdBy,
      },
    });

    return toExperiment(row as MemoryRow);
  },

  async getExperiment(id: string): Promise<PriceExperiment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'price_experiment') return null;
    return toExperiment(row as MemoryRow);
  },

  async listExperiments(organizationId: string, opts: ListPriceExperimentsOpts = {}): Promise<PriceExperiment[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'price_experiment', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toExperiment(r as MemoryRow));
    if (opts.status) records = records.filter((e) => e.status === opts.status);
    if (opts.modelId) records = records.filter((e) => e.modelId === opts.modelId);
    return records;
  },

  async updateExperiment(id: string, input: UpdatePriceExperimentInput): Promise<PriceExperiment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseExperiment(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.modelId !== undefined) content.modelId = input.modelId;
    if (input.variants !== undefined) content.variants = input.variants.map((v) => ({
      name: v.name, price: v.price, description: v.description ?? '', weight: v.weight ?? 1,
    }));
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.status !== undefined) content.status = input.status;
    if (input.targetSegment !== undefined) content.targetSegment = input.targetSegment;
    if (input.successMetric !== undefined) content.successMetric = input.successMetric;
    if (input.results !== undefined) content.results = input.results;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['price_experiment', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toExperiment(row as MemoryRow);
  },

  async startExperiment(id: string, startedBy: string): Promise<PriceExperiment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseExperiment(existing.content);
    content.status = 'running';
    content.startedBy = startedBy;
    content.startedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['price_experiment', 'running']),
        },
      }), null,
    );
    if (!row) return null;
    return toExperiment(row as MemoryRow);
  },

  async endExperiment(id: string, results: string, endedBy: string): Promise<PriceExperiment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseExperiment(existing.content);
    content.status = 'completed';
    content.results = results;
    content.endedBy = endedBy;
    content.endedAt = new Date().toISOString();

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['price_experiment', 'completed']),
        },
      }), null,
    );
    if (!row) return null;
    return toExperiment(row as MemoryRow);
  },

  // ── Discount Rules ──

  async createDiscountRule(
    organizationId: string,
    workspaceId: string,
    input: CreateDiscountRuleInput,
    createdBy: string,
  ): Promise<DiscountRule> {
    const content: DiscountRuleContent = {
      name: input.name.trim(),
      type: input.type,
      value: input.value,
      conditions: input.conditions ?? '',
      minQuantity: input.minQuantity ?? null,
      maxQuantity: input.maxQuantity ?? null,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      appliesTo: input.appliesTo ?? '',
      stackable: input.stackable ?? false,
      status: input.status ?? 'active',
      usageLimit: input.usageLimit ?? null,
      usageCount: input.usageCount ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'discount_rule',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['discount_rule', content.type, content.status]),
        createdBy,
      },
    });

    return toDiscount(row as MemoryRow);
  },

  async getDiscountRule(id: string): Promise<DiscountRule | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'discount_rule') return null;
    return toDiscount(row as MemoryRow);
  },

  async listDiscountRules(organizationId: string, opts: ListDiscountRulesOpts = {}): Promise<DiscountRule[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'discount_rule', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toDiscount(r as MemoryRow));
    if (opts.type) records = records.filter((d) => d.type === opts.type);
    if (opts.status) records = records.filter((d) => d.status === opts.status);
    return records;
  },

  async updateDiscountRule(id: string, input: UpdateDiscountRuleInput): Promise<DiscountRule | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseDiscount(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.value !== undefined) content.value = input.value;
    if (input.conditions !== undefined) content.conditions = input.conditions;
    if (input.minQuantity !== undefined) content.minQuantity = input.minQuantity;
    if (input.maxQuantity !== undefined) content.maxQuantity = input.maxQuantity;
    if (input.validFrom !== undefined) content.validFrom = input.validFrom;
    if (input.validTo !== undefined) content.validTo = input.validTo;
    if (input.appliesTo !== undefined) content.appliesTo = input.appliesTo;
    if (input.stackable !== undefined) content.stackable = input.stackable;
    if (input.status !== undefined) content.status = input.status;
    if (input.usageLimit !== undefined) content.usageLimit = input.usageLimit;
    if (input.usageCount !== undefined) content.usageCount = input.usageCount;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['discount_rule', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toDiscount(row as MemoryRow);
  },

  async deleteDiscountRule(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Revenue Streams ──

  async createRevenueStream(
    organizationId: string,
    workspaceId: string,
    input: CreateRevenueStreamInput,
    createdBy: string,
  ): Promise<RevenueStream> {
    const content: RevenueStreamContent = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      pricingModelId: input.pricingModelId ?? null,
      currentMrr: input.currentMrr ?? 0,
      projectedMrr: input.projectedMrr ?? 0,
      growthRate: input.growthRate ?? 0,
      status: input.status ?? 'active',
      startDate: input.startDate ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'revenue_stream',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.pricingModelId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['revenue_stream', content.type, content.status]),
        createdBy,
      },
    });

    return toStream(row as MemoryRow);
  },

  async getRevenueStream(id: string): Promise<RevenueStream | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'revenue_stream') return null;
    return toStream(row as MemoryRow);
  },

  async listRevenueStreams(organizationId: string, opts: ListRevenueStreamsOpts = {}): Promise<RevenueStream[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'revenue_stream', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toStream(r as MemoryRow));
    if (opts.type) records = records.filter((s) => s.type === opts.type);
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    return records;
  },

  async updateRevenueStream(id: string, input: UpdateRevenueStreamInput): Promise<RevenueStream | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseStream(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.pricingModelId !== undefined) content.pricingModelId = input.pricingModelId;
    if (input.currentMrr !== undefined) content.currentMrr = input.currentMrr;
    if (input.projectedMrr !== undefined) content.projectedMrr = input.projectedMrr;
    if (input.growthRate !== undefined) content.growthRate = input.growthRate;
    if (input.status !== undefined) content.status = input.status;
    if (input.startDate !== undefined) content.startDate = input.startDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['revenue_stream', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toStream(row as MemoryRow);
  },

  async deleteRevenueStream(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  // ── Metrics ──

  async getPricingMetrics(organizationId: string): Promise<PricingMetrics> {
    const [streams, experiments, discounts, models, tiers] = await Promise.all([
      PricingService.listRevenueStreams(organizationId),
      PricingService.listExperiments(organizationId),
      PricingService.listDiscountRules(organizationId),
      PricingService.listModels(organizationId),
      PricingService.listTiers(organizationId),
    ]);

    const activeStreams = streams.filter((s) => s.status === 'active');
    const totalMrr = activeStreams.reduce((sum, s) => sum + s.currentMrr, 0);
    const projectedMrr = activeStreams.reduce((sum, s) => sum + s.projectedMrr, 0);

    const revenueByStream = activeStreams.map((s) => ({
      name: s.name, type: s.type, currentMrr: s.currentMrr, projectedMrr: s.projectedMrr,
    }));

    const activeExperiments = experiments.filter((e) => e.status === 'running').length;

    const activeDiscounts = discounts.filter((d) => d.status === 'active');
    const totalUsage = activeDiscounts.reduce((sum, d) => sum + d.usageCount, 0);
    const totalLimit = activeDiscounts.reduce((sum, d) => sum + (d.usageLimit ?? 0), 0);
    const discountUtilization = totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0;

    const activeModels = models.filter((m) => m.status === 'active');
    const modelsWithTiers = new Set(tiers.filter((t) => t.status === 'active').map((t) => t.modelId));
    const pricingModelCoverage = activeModels.length > 0
      ? Math.round((modelsWithTiers.size / activeModels.length) * 100)
      : 0;

    return {
      totalMrr, projectedMrr, revenueByStream,
      activeExperiments, discountUtilization, pricingModelCoverage,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<PricingStats> {
    const [models, tiers, experiments, discounts, streams] = await Promise.all([
      PricingService.listModels(organizationId),
      PricingService.listTiers(organizationId),
      PricingService.listExperiments(organizationId),
      PricingService.listDiscountRules(organizationId),
      PricingService.listRevenueStreams(organizationId),
    ]);

    const byModelType: Record<string, number> = {};
    for (const m of models) byModelType[m.type] = (byModelType[m.type] || 0) + 1;

    const byDiscountType: Record<string, number> = {};
    for (const d of discounts) byDiscountType[d.type] = (byDiscountType[d.type] || 0) + 1;

    const byRevenueStreamType: Record<string, number> = {};
    for (const s of streams) byRevenueStreamType[s.type] = (byRevenueStreamType[s.type] || 0) + 1;

    const activeStreams = streams.filter((s) => s.status === 'active');
    const totalMrr = activeStreams.reduce((sum, s) => sum + s.currentMrr, 0);
    const projectedMrr = activeStreams.reduce((sum, s) => sum + s.projectedMrr, 0);

    return {
      modelCount: models.length,
      activeModelCount: models.filter((m) => m.status === 'active').length,
      tierCount: tiers.length,
      experimentCount: experiments.length,
      runningExperimentCount: experiments.filter((e) => e.status === 'running').length,
      discountCount: discounts.length,
      activeDiscountCount: discounts.filter((d) => d.status === 'active').length,
      revenueStreamCount: streams.length,
      activeRevenueStreamCount: activeStreams.length,
      totalMrr, projectedMrr,
      byModelType, byDiscountType, byRevenueStreamType,
    };
  },
};
