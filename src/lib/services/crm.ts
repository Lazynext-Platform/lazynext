import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Customer Service ──

export const CustomerService = {
  /**
   * List customers for a workspace with optional status/type filter.
   */
  async list(workspaceId: string, filters?: { status?: string; type?: string }) {
    return safePrisma(() =>
      prisma.customer.findMany({
        where: {
          workspaceId,
          ...(filters?.status && { status: filters.status }),
          ...(filters?.type && { type: filters.type }),
        },
        include: {
          _count: { select: { deals: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single customer by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.customer.findUnique({
        where: { id },
        include: {
          deals: { orderBy: { updatedAt: 'desc' }, take: 20 },
        },
      }),
    null);
  },

  /**
   * Create a new customer.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    type?: string;
    status?: string;
    source?: string;
    value?: number;
    currency?: string;
    notes?: string;
    ownerId?: string;
  }) {
    return prisma.customer.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 300),
        email: input.email?.slice(0, 500) || null,
        phone: input.phone?.slice(0, 100) || null,
        company: input.company?.slice(0, 300) || null,
        type: input.type || 'lead',
        status: input.status || 'new',
        source: input.source?.slice(0, 100) || null,
        value: input.value ?? 0,
        currency: input.currency || 'USD',
        notes: input.notes?.slice(0, 5000) || null,
        ownerId: input.ownerId || null,
      },
    });
  },

  /**
   * Update a customer.
   */
  async update(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    type?: string;
    status?: string;
    source?: string;
    value?: number;
    currency?: string;
    notes?: string;
    ownerId?: string;
    lastContactedAt?: Date;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.slice(0, 300);
    if (data.email !== undefined) updateData.email = data.email?.slice(0, 500) || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.slice(0, 100) || null;
    if (data.company !== undefined) updateData.company = data.company?.slice(0, 300) || null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.source !== undefined) updateData.source = data.source?.slice(0, 100) || null;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes?.slice(0, 5000) || null;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId || null;
    if (data.lastContactedAt !== undefined) updateData.lastContactedAt = data.lastContactedAt;

    return prisma.customer.update({ where: { id }, data: updateData });
  },

  /**
   * Update a customer's status.
   */
  async updateStatus(id: string, status: string) {
    return prisma.customer.update({
      where: { id },
      data: { status },
    });
  },
};

// ── Deal Service ──

export const DealService = {
  /**
   * List deals for a workspace with optional stage filter.
   */
  async list(workspaceId: string, filters?: { stage?: string }) {
    return safePrisma(() =>
      prisma.deal.findMany({
        where: {
          workspaceId,
          ...(filters?.stage && { stage: filters.stage }),
        },
        include: {
          customer: { select: { id: true, name: true, email: true, company: true } },
          product: { select: { id: true, name: true, price: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single deal by ID.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.deal.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
        },
      }),
    null);
  },

  /**
   * Create a new deal.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    customerId: string;
    productId?: string;
    title: string;
    description?: string;
    stage?: string;
    value?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: Date;
    ownerId?: string;
    source?: string;
  }) {
    return prisma.deal.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        customerId: input.customerId,
        productId: input.productId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || null,
        stage: input.stage || 'lead',
        value: input.value ?? 0,
        currency: input.currency || 'USD',
        probability: Math.max(0, Math.min(100, input.probability ?? 0)),
        expectedCloseDate: input.expectedCloseDate || null,
        ownerId: input.ownerId || null,
        source: input.source?.slice(0, 100) || null,
      },
    });
  },

  /**
   * Update a deal.
   */
  async update(id: string, data: {
    title?: string;
    description?: string;
    stage?: string;
    value?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: Date | null;
    actualCloseDate?: Date | null;
    ownerId?: string;
    productId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description?.slice(0, 5000) || null;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.probability !== undefined) updateData.probability = Math.max(0, Math.min(100, data.probability));
    if (data.expectedCloseDate !== undefined) updateData.expectedCloseDate = data.expectedCloseDate;
    if (data.actualCloseDate !== undefined) updateData.actualCloseDate = data.actualCloseDate;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId || null;
    if (data.productId !== undefined) updateData.productId = data.productId || null;

    return prisma.deal.update({ where: { id }, data: updateData });
  },

  /**
   * Update a deal's stage.
   */
  async updateStage(id: string, stage: string) {
    const updateData: Record<string, unknown> = { stage };
    // Set actual close date when deal is won or lost
    if (stage === 'won' || stage === 'lost') {
      updateData.actualCloseDate = new Date();
      updateData.probability = stage === 'won' ? 100 : 0;
    }
    return prisma.deal.update({ where: { id }, data: updateData });
  },

  /**
   * Get pipeline stats: deal count and total value grouped by stage.
   */
  async getPipelineStats(workspaceId: string) {
    const deals = await safePrisma(() =>
      prisma.deal.findMany({
        where: { workspaceId },
        select: { stage: true, value: true, currency: true },
      }),
    []);

    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
    const stats: Record<string, { count: number; totalValue: number }> = {};
    for (const stage of stages) {
      stats[stage] = { count: 0, totalValue: 0 };
    }
    for (const deal of deals) {
      if (!stats[deal.stage]) stats[deal.stage] = { count: 0, totalValue: 0 };
      stats[deal.stage].count += 1;
      stats[deal.stage].totalValue += deal.value;
    }
    return stats;
  },
};
