/**
 * Creative Integration Service
 *
 * Additive integration layer that bridges creative workflows (Creation,
 * Asset, AdCampaign, CreativePerformance, WorkflowRun — all user-scoped)
 * into the OS (workspace/organization-scoped Plans, Tasks, Memory, Events)
 * without modifying the existing creative routes or models.
 *
 * Key principle: creative models are userId-scoped, OS models are
 * workspaceId/organizationId-scoped. This service translates between the
 * two scopes by accepting both userId (for creative queries) and
 * workspaceId/organizationId (for OS writes).
 */
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface CreativeSummary {
  totalCreations: number;
  byStatus: Record<string, number>;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  avgRoas: number;
  topCreatives: Array<{ id: string; prompt: string; status: string; roas?: number }>;
}

export interface PerformanceInsights {
  totalRecords: number;
  totalSpend: number;
  totalRevenue: number;
  avgRoas: number;
  avgCtr: number;
  avgCvr: number;
  topHooks: Array<{ hookType: string; count: number; avgRoas: number }>;
  topAngles: Array<{ angleName: string; count: number; avgRoas: number }>;
  topPlatforms: Array<{ platform: string; count: number; avgRoas: number; spend: number }>;
  roasTrend: Array<{ recordedAt: string; avgRoas: number }>;
}

export interface CampaignPlanInput {
  campaignId: string;
  title: string;
  objective: string;
  tasks: Array<{ title: string; description?: string; priority?: string }>;
}

export interface GrowthDashboard {
  summary: CreativeSummary;
  insights: PerformanceInsights;
  activeCampaigns: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    budgetDaily?: number;
    budgetTotal?: number;
  }>;
  recentCreations: Array<{
    id: string;
    prompt: string;
    status: string;
    model: string;
    createdAt: string;
  }>;
  linkedPlans: Array<{ id: string; title: string; status: string }>;
  linkedTasks: Array<{ id: string; title: string; status: string; priority: string }>;
}

// ── Creative Integration Service ──

export const CreativeIntegrationService = {
  /**
   * Link a Creation to an OS Task by storing the task ID in Creation metadata.
   * The Creation model has no taskId field, so we store the link in the
   * `assets` JSON column (which holds structured intermediate assets) under a
   * `_osLinks` key. This is additive and does not modify the schema.
   */
  async linkCreationToTask(creationId: string, taskId: string) {
    const creation = await safePrisma(() =>
      prisma.creation.findUnique({ where: { id: creationId }, select: { id: true, assets: true } }),
      null,
    );
    if (!creation) return null;

    const assets = (creation.assets as Record<string, unknown> | null) || {};
    const osLinks = (assets._osLinks as Record<string, unknown> | null) || {};
    osLinks.taskId = taskId;
    assets._osLinks = osLinks;

    return prisma.creation.update({
      where: { id: creationId },
      data: { assets: assets as unknown as undefined },
      select: { id: true, assets: true },
    });
  },

  /**
   * Link an AdCampaign to an OS Plan by storing the plan ID in the campaign's
   * `targeting` JSON column under a `_osLinks` key. Additive, no schema change.
   */
  async linkCampaignToPlan(campaignId: string, planId: string) {
    const campaign = await safePrisma(() =>
      prisma.adCampaign.findUnique({ where: { id: campaignId }, select: { id: true, targeting: true } }),
      null,
    );
    if (!campaign) return null;

    const targeting = (campaign.targeting as Record<string, unknown> | null) || {};
    const osLinks = (targeting._osLinks as Record<string, unknown> | null) || {};
    osLinks.planId = planId;
    targeting._osLinks = osLinks;

    return prisma.adCampaign.update({
      where: { id: campaignId },
      data: { targeting: targeting as unknown as undefined },
      select: { id: true, targeting: true },
    });
  },

  /**
   * Create a Memory record for creative work (type: 'outcome', source: 'agent').
   */
  async recordCreativeMemory(
    workspaceId: string,
    organizationId: string,
    input: {
      content: string;
      sourceId?: string;
      confidence?: number;
      tags?: string[];
      createdBy: string;
    },
  ) {
    return MemoryService.create({
      workspaceId,
      organizationId,
      type: 'outcome',
      content: input.content,
      source: 'agent',
      sourceId: input.sourceId,
      confidence: input.confidence,
      tags: input.tags,
      createdBy: input.createdBy,
    });
  },

  /**
   * Emit an OS Event for creative milestones.
   */
  async emitCreativeEvent(
    workspaceId: string,
    organizationId: string,
    input: {
      type: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
      actor?: string;
    },
  ) {
    return EventService.emit({
      workspaceId,
      organizationId,
      type: input.type,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      actor: input.actor,
      actorType: 'agent',
      source: 'creative',
    });
  },

  /**
   * Aggregate creative stats for a user: total creations, by status, total
   * campaigns, total spend, total revenue, avg ROAS, top performing creatives.
   */
  async getCreativeSummary(userId: string): Promise<CreativeSummary> {
    const creations = await safePrisma(() =>
      prisma.creation.findMany({
        where: { userId },
        select: { id: true, prompt: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      [],
    );

    const byStatus: Record<string, number> = {};
    for (const c of creations) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    const campaigns = await safePrisma(() =>
      prisma.adCampaign.findMany({
        where: { userId },
        select: { id: true, status: true, metrics: true },
        take: 500,
      }),
      [],
    );

    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

    const performance = await safePrisma(() =>
      prisma.creativePerformance.findMany({
        where: { userId },
        select: { creationId: true, spend: true, revenue: true, roas: true },
        take: 1000,
      }),
      [],
    );

    const totalSpend = performance.reduce((sum, p) => sum + (p.spend || 0), 0);
    const totalRevenue = performance.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const avgRoas = performance.length > 0
      ? performance.reduce((sum, p) => sum + (p.roas || 0), 0) / performance.length
      : 0;

    // Top performing creatives by ROAS
    const creativeRoas: Record<string, { roasSum: number; count: number }> = {};
    for (const p of performance) {
      if (!creativeRoas[p.creationId]) creativeRoas[p.creationId] = { roasSum: 0, count: 0 };
      creativeRoas[p.creationId].roasSum += p.roas || 0;
      creativeRoas[p.creationId].count += 1;
    }

    const topCreativeIds = Object.entries(creativeRoas)
      .map(([id, v]) => ({ id, avgRoas: v.roasSum / v.count }))
      .sort((a, b) => b.avgRoas - a.avgRoas)
      .slice(0, 5)
      .map((t) => t.id);

    const topCreatives: CreativeSummary['topCreatives'] = [];
    for (const id of topCreativeIds) {
      const creation = creations.find((c) => c.id === id);
      if (creation) {
        topCreatives.push({
          id: creation.id,
          prompt: creation.prompt,
          status: creation.status,
          roas: creativeRoas[id].roasSum / creativeRoas[id].count,
        });
      }
    }

    return {
      totalCreations: creations.length,
      byStatus,
      totalCampaigns: campaigns.length,
      activeCampaigns,
      totalSpend,
      totalRevenue,
      avgRoas,
      topCreatives,
    };
  },

  /**
   * Aggregate CreativePerformance records and return insights: top hooks,
   * angles, platforms, ROAS trends.
   */
  async getPerformanceInsights(userId: string): Promise<PerformanceInsights> {
    const records = await safePrisma(() =>
      prisma.creativePerformance.findMany({
        where: { userId },
        select: {
          id: true,
          hookType: true,
          angleName: true,
          platform: true,
          spend: true,
          revenue: true,
          roas: true,
          ctr: true,
          cvr: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: 1000,
      }),
      [],
    );

    const totalSpend = records.reduce((s, r) => s + (r.spend || 0), 0);
    const totalRevenue = records.reduce((s, r) => s + (r.revenue || 0), 0);
    const avgRoas = records.length > 0
      ? records.reduce((s, r) => s + (r.roas || 0), 0) / records.length
      : 0;
    const avgCtr = records.length > 0
      ? records.reduce((s, r) => s + (r.ctr || 0), 0) / records.length
      : 0;
    const avgCvr = records.length > 0
      ? records.reduce((s, r) => s + (r.cvr || 0), 0) / records.length
      : 0;

    // Aggregate by hook type
    const hookMap: Record<string, { count: number; roasSum: number }> = {};
    for (const r of records) {
      if (!r.hookType) continue;
      if (!hookMap[r.hookType]) hookMap[r.hookType] = { count: 0, roasSum: 0 };
      hookMap[r.hookType].count += 1;
      hookMap[r.hookType].roasSum += r.roas || 0;
    }
    const topHooks = Object.entries(hookMap)
      .map(([hookType, v]) => ({ hookType, count: v.count, avgRoas: v.roasSum / v.count }))
      .sort((a, b) => b.avgRoas - a.avgRoas)
      .slice(0, 5);

    // Aggregate by angle
    const angleMap: Record<string, { count: number; roasSum: number }> = {};
    for (const r of records) {
      if (!r.angleName) continue;
      if (!angleMap[r.angleName]) angleMap[r.angleName] = { count: 0, roasSum: 0 };
      angleMap[r.angleName].count += 1;
      angleMap[r.angleName].roasSum += r.roas || 0;
    }
    const topAngles = Object.entries(angleMap)
      .map(([angleName, v]) => ({ angleName, count: v.count, avgRoas: v.roasSum / v.count }))
      .sort((a, b) => b.avgRoas - a.avgRoas)
      .slice(0, 5);

    // Aggregate by platform
    const platformMap: Record<string, { count: number; roasSum: number; spend: number }> = {};
    for (const r of records) {
      if (!r.platform) continue;
      if (!platformMap[r.platform]) platformMap[r.platform] = { count: 0, roasSum: 0, spend: 0 };
      platformMap[r.platform].count += 1;
      platformMap[r.platform].roasSum += r.roas || 0;
      platformMap[r.platform].spend += r.spend || 0;
    }
    const topPlatforms = Object.entries(platformMap)
      .map(([platform, v]) => ({
        platform,
        count: v.count,
        avgRoas: v.roasSum / v.count,
        spend: v.spend,
      }))
      .sort((a, b) => b.avgRoas - a.avgRoas)
      .slice(0, 5);

    // ROAS trend (last 10 recorded dates, chronological)
    const trendRecords = [...records].reverse().slice(-10);
    const roasTrend = trendRecords.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      avgRoas: r.roas || 0,
    }));

    return {
      totalRecords: records.length,
      totalSpend,
      totalRevenue,
      avgRoas,
      avgCtr,
      avgCvr,
      topHooks,
      topAngles,
      topPlatforms,
      roasTrend,
    };
  },

  /**
   * Read CreativePerformance records, create Memory records with insights,
   * and emit an Event. This wires performance feedback into OS memory/events.
   */
  async syncPerformanceToMemory(
    workspaceId: string,
    organizationId: string,
    userId: string,
  ) {
    const insights = await this.getPerformanceInsights(userId);

    const summaryParts: string[] = [
      `Creative performance sync: ${insights.totalRecords} records.`,
      `Total spend: $${insights.totalSpend.toFixed(2)}, revenue: $${insights.totalRevenue.toFixed(2)}.`,
      `Avg ROAS: ${insights.avgRoas.toFixed(2)}, CTR: ${insights.avgCtr.toFixed(4)}, CVR: ${insights.avgCvr.toFixed(4)}.`,
    ];
    if (insights.topHooks.length > 0) {
      summaryParts.push(`Top hooks: ${insights.topHooks.map((h) => `${h.hookType} (${h.avgRoas.toFixed(2)})`).join(', ')}.`);
    }
    if (insights.topAngles.length > 0) {
      summaryParts.push(`Top angles: ${insights.topAngles.map((a) => `${a.angleName} (${a.avgRoas.toFixed(2)})`).join(', ')}.`);
    }
    if (insights.topPlatforms.length > 0) {
      summaryParts.push(`Top platforms: ${insights.topPlatforms.map((p) => `${p.platform} (${p.avgRoas.toFixed(2)})`).join(', ')}.`);
    }

    const memory = await this.recordCreativeMemory(workspaceId, organizationId, {
      content: summaryParts.join(' '),
      sourceId: userId,
      confidence: insights.totalRecords > 0 ? 0.8 : 0.3,
      tags: ['creative', 'performance', 'sync'],
      createdBy: userId,
    });

    const event = await this.emitCreativeEvent(workspaceId, organizationId, {
      type: 'creative.performance_synced',
      resourceType: 'creativePerformance',
      metadata: {
        totalRecords: insights.totalRecords,
        totalSpend: insights.totalSpend,
        totalRevenue: insights.totalRevenue,
        avgRoas: insights.avgRoas,
        topHooks: insights.topHooks,
        topPlatforms: insights.topPlatforms,
      },
      actor: userId,
    });

    return { memory, event, insights };
  },

  /**
   * Create a Plan + Tasks for a creative campaign, linking to the campaign.
   */
  async createCampaignPlan(
    workspaceId: string,
    organizationId: string,
    input: CampaignPlanInput,
  ) {
    const plan = await prisma.plan.create({
      data: {
        workspaceId,
        organizationId,
        title: input.title.slice(0, 300),
        objective: input.objective.slice(0, 5000),
        status: 'active',
        priority: 'medium',
        riskLevel: 'low',
      },
    });

    // Find or create a default project for tasks
    const project = await safePrisma(() =>
      prisma.project.findFirst({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
      null,
    );

    const tasks: Array<{ id: string; title: string }> = [];
    if (project) {
      for (const t of input.tasks) {
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            planId: plan.id,
            title: t.title.slice(0, 300),
            description: (t.description || '').slice(0, 5000),
            priority: t.priority || 'medium',
            status: 'todo',
          },
          select: { id: true, title: true },
        });
        tasks.push(task);
      }
    }

    // Link the campaign to the plan
    await this.linkCampaignToPlan(input.campaignId, plan.id);

    // Emit an event
    await this.emitCreativeEvent(workspaceId, organizationId, {
      type: 'creative.campaign_plan_created',
      resourceType: 'plan',
      resourceId: plan.id,
      metadata: { campaignId: input.campaignId, taskCount: tasks.length },
    });

    return { plan, tasks };
  },

  /**
   * Combined growth/marketing dashboard: creative summary, performance
   * insights, active campaigns, recent creations, linked plans/tasks.
   */
  async getGrowthDashboard(
    workspaceId: string,
    organizationId: string,
    userId: string,
  ): Promise<GrowthDashboard> {
    const [summary, insights, campaigns, creations, plans, tasks] = await Promise.all([
      this.getCreativeSummary(userId),
      this.getPerformanceInsights(userId),
      safePrisma(() =>
        prisma.adCampaign.findMany({
          where: { userId, status: { in: ['active', 'pending_approval', 'draft'] } },
          select: { id: true, name: true, platform: true, status: true, budgetDaily: true, budgetTotal: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        [],
      ),
      safePrisma(() =>
        prisma.creation.findMany({
          where: { userId },
          select: { id: true, prompt: true, status: true, model: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        [],
      ),
      safePrisma(() =>
        prisma.plan.findMany({
          where: { workspaceId, status: { in: ['active', 'draft'] } },
          select: { id: true, title: true, status: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        [],
      ),
      safePrisma(() =>
        prisma.task.findMany({
          where: { project: { workspaceId }, planId: { not: null } },
          select: { id: true, title: true, status: true, priority: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        [],
      ),
    ]);

    return {
      summary,
      insights,
      activeCampaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        budgetDaily: c.budgetDaily ?? undefined,
        budgetTotal: c.budgetTotal ?? undefined,
      })),
      recentCreations: creations.map((c) => ({
        id: c.id,
        prompt: c.prompt,
        status: c.status,
        model: c.model,
        createdAt: c.createdAt.toISOString(),
      })),
      linkedPlans: plans.map((p) => ({ id: p.id, title: p.title, status: p.status })),
      linkedTasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    };
  },
};
