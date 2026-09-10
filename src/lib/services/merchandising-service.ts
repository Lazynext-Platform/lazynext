import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AssortmentType = 'core' | 'seasonal' | 'trend' | 'clearance' | 'exclusive' | 'new_arrival' | 'capsule';
export type AssortmentStatus = 'planned' | 'active' | 'discontinued' | 'archived';
export type PlanogramType = 'shelf' | 'endcap' | 'display' | 'window' | 'floor' | 'counter' | 'digital';
export type PlanogramStatus = 'draft' | 'published' | 'archived';
export type PricingType = 'regular' | 'sale' | 'clearance' | 'bundle' | 'volume' | 'promotional' | 'map';
export type PricingStatus = 'active' | 'scheduled' | 'expired' | 'cancelled';
export type PromotionType = 'discount' | 'bogo' | 'gift_with_purchase' | 'loyalty' | 'flash_sale' | 'seasonal' | 'clearance' | 'coupon';
export type PromotionStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

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

export interface MerchAssortment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AssortmentType;
  status: AssortmentStatus;
  category: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchPlanogram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PlanogramType;
  status: PlanogramStatus;
  location: string;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchPricing {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string | null;
  productName: string;
  type: PricingType;
  status: PricingStatus;
  price: number;
  originalPrice: number;
  currency: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchPromotion {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  description: string;
  discount: number;
  startDate: Date | null;
  endDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchandisingMetrics {
  activeAssortments: number;
  publishedPlanograms: number;
  activePricings: number;
  activePromotions: number;
}

export interface MerchandisingStats {
  assortmentCount: number;
  planogramCount: number;
  pricingCount: number;
  promotionCount: number;
  byAssortmentType: Record<string, number>;
  byAssortmentStatus: Record<string, number>;
  byPlanogramType: Record<string, number>;
  byPlanogramStatus: Record<string, number>;
  byPricingType: Record<string, number>;
  byPricingStatus: Record<string, number>;
  byPromotionType: Record<string, number>;
  byPromotionStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAssortmentInput {
  name: string;
  type: AssortmentType;
  status?: AssortmentStatus;
  category?: string;
  description?: string;
  notes?: string;
}

export interface UpdateAssortmentInput {
  name?: string;
  type?: AssortmentType;
  status?: AssortmentStatus;
  category?: string;
  description?: string;
  notes?: string;
}

export interface ListAssortmentsOpts {
  type?: AssortmentType;
  status?: AssortmentStatus;
  category?: string;
}

export interface CreatePlanogramInput {
  name: string;
  type: PlanogramType;
  status?: PlanogramStatus;
  location?: string;
  description?: string;
  notes?: string;
}

export interface UpdatePlanogramInput {
  name?: string;
  type?: PlanogramType;
  status?: PlanogramStatus;
  location?: string;
  description?: string;
  notes?: string;
}

export interface ListPlanogramsOpts {
  type?: PlanogramType;
  status?: PlanogramStatus;
}

export interface CreatePricingInput {
  productId?: string;
  productName: string;
  type: PricingType;
  price: number;
  originalPrice?: number;
  currency?: string;
  status?: PricingStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdatePricingInput {
  productId?: string;
  productName?: string;
  type?: PricingType;
  price?: number;
  originalPrice?: number;
  currency?: string;
  status?: PricingStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ListPricingsOpts {
  type?: PricingType;
  status?: PricingStatus;
}

export interface CreatePromotionInput {
  name: string;
  type: PromotionType;
  status?: PromotionStatus;
  description?: string;
  discount?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdatePromotionInput {
  name?: string;
  type?: PromotionType;
  status?: PromotionStatus;
  description?: string;
  discount?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface ListPromotionsOpts {
  type?: PromotionType;
  status?: PromotionStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toAssortment(row: MemoryRow): MerchAssortment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AssortmentType) ?? 'core',
    status: (c.status as AssortmentStatus) ?? 'planned',
    category: (c.category as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPlanogram(row: MemoryRow): MerchPlanogram {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PlanogramType) ?? 'shelf',
    status: (c.status as PlanogramStatus) ?? 'draft',
    location: (c.location as string) ?? '',
    description: (c.description as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPricing(row: MemoryRow): MerchPricing {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    productId: (c.productId as string) ?? null,
    productName: (c.productName as string) ?? '',
    type: (c.type as PricingType) ?? 'regular',
    status: (c.status as PricingStatus) ?? 'active',
    price: (c.price as number) ?? 0,
    originalPrice: (c.originalPrice as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPromotion(row: MemoryRow): MerchPromotion {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PromotionType) ?? 'discount',
    status: (c.status as PromotionStatus) ?? 'draft',
    description: (c.description as string) ?? '',
    discount: (c.discount as number) ?? 0,
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const MerchandisingService = {
  // ── Assortments ──

  async createAssortment(organizationId: string, workspaceId: string, input: CreateAssortmentInput, createdBy: string): Promise<MerchAssortment> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'planned',
      category: input.category ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'merch_assortment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['merch_assortment', content.type, content.status]),
        createdBy,
      },
    });
    return toAssortment(row as MemoryRow);
  },

  async getAssortment(id: string): Promise<MerchAssortment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'merch_assortment') return null;
    return toAssortment(row as MemoryRow);
  },

  async listAssortments(organizationId: string, opts: ListAssortmentsOpts = {}): Promise<MerchAssortment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'merch_assortment' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.category) conditions.push({ content: { contains: `"category":"${opts.category}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAssortment);
  },

  async updateAssortment(id: string, input: UpdateAssortmentInput): Promise<MerchAssortment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['merch_assortment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAssortment(row as MemoryRow);
  },

  async deleteAssortment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateAssortment(id: string, _activatedBy: string): Promise<MerchAssortment | null> {
    return MerchandisingService.updateAssortment(id, { status: 'active' });
  },

  async discontinueAssortment(id: string, _discontinuedBy: string): Promise<MerchAssortment | null> {
    return MerchandisingService.updateAssortment(id, { status: 'discontinued' });
  },

  // ── Planograms ──

  async createPlanogram(organizationId: string, workspaceId: string, input: CreatePlanogramInput, createdBy: string): Promise<MerchPlanogram> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'draft',
      location: input.location ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'merch_planogram',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['merch_planogram', content.type, content.status]),
        createdBy,
      },
    });
    return toPlanogram(row as MemoryRow);
  },

  async getPlanogram(id: string): Promise<MerchPlanogram | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'merch_planogram') return null;
    return toPlanogram(row as MemoryRow);
  },

  async listPlanograms(organizationId: string, opts: ListPlanogramsOpts = {}): Promise<MerchPlanogram[]> {
    const where: Record<string, unknown> = { organizationId, type: 'merch_planogram' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPlanogram);
  },

  async updatePlanogram(id: string, input: UpdatePlanogramInput): Promise<MerchPlanogram | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['merch_planogram', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPlanogram(row as MemoryRow);
  },

  async deletePlanogram(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async publishPlanogram(id: string, _publishedBy: string): Promise<MerchPlanogram | null> {
    return MerchandisingService.updatePlanogram(id, { status: 'published' });
  },

  async archivePlanogram(id: string, _archivedBy: string): Promise<MerchPlanogram | null> {
    return MerchandisingService.updatePlanogram(id, { status: 'archived' });
  },

  // ── Pricing ──

  async createPricing(organizationId: string, workspaceId: string, input: CreatePricingInput, createdBy: string): Promise<MerchPricing> {
    const content = {
      productId: input.productId ?? null,
      productName: input.productName.trim(),
      type: input.type,
      price: input.price,
      originalPrice: input.originalPrice ?? 0,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'active',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'merch_pricing',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.productId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['merch_pricing', content.type, content.status]),
        createdBy,
      },
    });
    return toPricing(row as MemoryRow);
  },

  async getPricing(id: string): Promise<MerchPricing | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'merch_pricing') return null;
    return toPricing(row as MemoryRow);
  },

  async listPricings(organizationId: string, opts: ListPricingsOpts = {}): Promise<MerchPricing[]> {
    const where: Record<string, unknown> = { organizationId, type: 'merch_pricing' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPricing);
  },

  async updatePricing(id: string, input: UpdatePricingInput): Promise<MerchPricing | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.productId !== undefined && { productId: input.productId }),
      ...(input.productName !== undefined && { productName: input.productName.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.originalPrice !== undefined && { originalPrice: input.originalPrice }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['merch_pricing', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPricing(row as MemoryRow);
  },

  async deletePricing(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async expirePricing(id: string, _expiredBy: string): Promise<MerchPricing | null> {
    return MerchandisingService.updatePricing(id, { status: 'expired' });
  },

  // ── Promotions ──

  async createPromotion(organizationId: string, workspaceId: string, input: CreatePromotionInput, createdBy: string): Promise<MerchPromotion> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? 'draft',
      description: input.description ?? '',
      discount: input.discount ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'merch_promotion',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['merch_promotion', content.type, content.status]),
        createdBy,
      },
    });
    return toPromotion(row as MemoryRow);
  },

  async getPromotion(id: string): Promise<MerchPromotion | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'merch_promotion') return null;
    return toPromotion(row as MemoryRow);
  },

  async listPromotions(organizationId: string, opts: ListPromotionsOpts = {}): Promise<MerchPromotion[]> {
    const where: Record<string, unknown> = { organizationId, type: 'merch_promotion' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPromotion);
  },

  async updatePromotion(id: string, input: UpdatePromotionInput): Promise<MerchPromotion | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.discount !== undefined && { discount: input.discount }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['merch_promotion', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPromotion(row as MemoryRow);
  },

  async deletePromotion(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async schedulePromotion(id: string, _scheduledBy: string): Promise<MerchPromotion | null> {
    return MerchandisingService.updatePromotion(id, { status: 'scheduled' });
  },

  async activatePromotion(id: string, _activatedBy: string): Promise<MerchPromotion | null> {
    return MerchandisingService.updatePromotion(id, { status: 'active' });
  },

  async completePromotion(id: string, _completedBy: string): Promise<MerchPromotion | null> {
    return MerchandisingService.updatePromotion(id, { status: 'completed' });
  },

  // ── Metrics & Stats ──

  async getMerchandisingMetrics(organizationId: string): Promise<MerchandisingMetrics> {
    const [assortments, planograms, pricings, promotions] = await Promise.all([
      MerchandisingService.listAssortments(organizationId),
      MerchandisingService.listPlanograms(organizationId),
      MerchandisingService.listPricings(organizationId),
      MerchandisingService.listPromotions(organizationId),
    ]);
    const activeAssortments = assortments.filter((a) => a.status === 'active').length;
    const publishedPlanograms = planograms.filter((p) => p.status === 'published').length;
    const activePricings = pricings.filter((p) => p.status === 'active').length;
    const activePromotions = promotions.filter((p) => p.status === 'active').length;
    return { activeAssortments, publishedPlanograms, activePricings, activePromotions };
  },

  async getMerchandisingStats(organizationId: string): Promise<MerchandisingStats> {
    const [assortments, planograms, pricings, promotions] = await Promise.all([
      MerchandisingService.listAssortments(organizationId),
      MerchandisingService.listPlanograms(organizationId),
      MerchandisingService.listPricings(organizationId),
      MerchandisingService.listPromotions(organizationId),
    ]);
    const byAssortmentType: Record<string, number> = {};
    const byAssortmentStatus: Record<string, number> = {};
    const byPlanogramType: Record<string, number> = {};
    const byPlanogramStatus: Record<string, number> = {};
    const byPricingType: Record<string, number> = {};
    const byPricingStatus: Record<string, number> = {};
    const byPromotionType: Record<string, number> = {};
    const byPromotionStatus: Record<string, number> = {};
    for (const a of assortments) { byAssortmentType[a.type] = (byAssortmentType[a.type] ?? 0) + 1; byAssortmentStatus[a.status] = (byAssortmentStatus[a.status] ?? 0) + 1; }
    for (const p of planograms) { byPlanogramType[p.type] = (byPlanogramType[p.type] ?? 0) + 1; byPlanogramStatus[p.status] = (byPlanogramStatus[p.status] ?? 0) + 1; }
    for (const p of pricings) { byPricingType[p.type] = (byPricingType[p.type] ?? 0) + 1; byPricingStatus[p.status] = (byPricingStatus[p.status] ?? 0) + 1; }
    for (const p of promotions) { byPromotionType[p.type] = (byPromotionType[p.type] ?? 0) + 1; byPromotionStatus[p.status] = (byPromotionStatus[p.status] ?? 0) + 1; }
    return {
      assortmentCount: assortments.length,
      planogramCount: planograms.length,
      pricingCount: pricings.length,
      promotionCount: promotions.length,
      byAssortmentType, byAssortmentStatus, byPlanogramType, byPlanogramStatus, byPricingType, byPricingStatus, byPromotionType, byPromotionStatus,
    };
  },
};
