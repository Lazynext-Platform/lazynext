import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AutonomyMode = 'manual' | 'assisted' | 'autonomous' | 'timed';

export interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  description: string | null;
  mission: string | null;
  vision: string | null;
  strategy: string | null;
  industry: string | null;
  website: string | null;
  targetMarket: string | null;
  logoUrl: string | null;
  autonomyMode: AutonomyMode;
  defaultWorkspaceId: string | null;
  workspaceCount: number;
  goalCount: number;
  memberCount: number;
}

// ── Company Service ──

export const CompanyService = {
  /**
   * Get a company (Organization) by ID with summary counts.
   */
  async get(companyId: string): Promise<CompanyDetail | null> {
    const org = await safePrisma(() =>
      prisma.organization.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: { workspaces: true, goals: true },
          },
        },
      }),
    null);
    if (!org) return null;

    // Count members across all workspaces
    const memberCount = await safePrisma(() =>
      prisma.membership.count({
        where: { workspace: { organizationId: companyId } },
      }),
    0);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerId: org.ownerId,
      plan: org.plan,
      description: org.description,
      mission: org.mission,
      vision: org.vision,
      strategy: org.strategy,
      industry: org.industry,
      website: org.website,
      targetMarket: org.targetMarket,
      logoUrl: org.logoUrl,
      autonomyMode: (org.autonomyMode as AutonomyMode) || 'manual',
      defaultWorkspaceId: org.defaultWorkspaceId,
      workspaceCount: org._count.workspaces,
      goalCount: org._count.goals,
      memberCount,
    };
  },

  /**
   * List companies (organizations) owned by a user.
   */
  async listForUser(userId: string) {
    return safePrisma(() =>
      prisma.organization.findMany({
        where: { ownerId: userId },
        include: { _count: { select: { workspaces: true, goals: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    []);
  },

  /**
   * Create a new company (organization) with a default workspace.
   */
  async create(userId: string, input: {
    name: string;
    description?: string;
    mission?: string;
    vision?: string;
    industry?: string;
    website?: string;
    targetMarket?: string;
  }): Promise<{ companyId: string; workspaceId: string }> {
    const slug = slugify(input.name);
    const org = await prisma.organization.create({
      data: {
        name: input.name.slice(0, 200),
        slug,
        ownerId: userId,
        description: input.description?.slice(0, 2000) || null,
        mission: input.mission?.slice(0, 2000) || null,
        vision: input.vision?.slice(0, 2000) || null,
        industry: input.industry?.slice(0, 100) || null,
        website: input.website?.slice(0, 500) || null,
        targetMarket: input.targetMarket?.slice(0, 1000) || null,
      },
    });

    // Create default workspace
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Default',
        slug: `${slug}-default`,
      },
    });

    // Create owner membership
    await prisma.membership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });

    // Set default workspace
    await prisma.organization.update({
      where: { id: org.id },
      data: { defaultWorkspaceId: workspace.id },
    });

    return { companyId: org.id, workspaceId: workspace.id };
  },

  /**
   * Update company fields.
   */
  async update(companyId: string, userId: string, input: {
    name?: string;
    description?: string;
    mission?: string;
    vision?: string;
    strategy?: string;
    industry?: string;
    website?: string;
    targetMarket?: string;
    logoUrl?: string;
    autonomyMode?: AutonomyMode;
  }) {
    const org = await prisma.organization.findUnique({ where: { id: companyId } });
    if (!org || org.ownerId !== userId) return null;

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.description !== undefined) data.description = input.description?.slice(0, 2000) || null;
    if (input.mission !== undefined) data.mission = input.mission?.slice(0, 2000) || null;
    if (input.vision !== undefined) data.vision = input.vision?.slice(0, 2000) || null;
    if (input.strategy !== undefined) data.strategy = input.strategy?.slice(0, 5000) || null;
    if (input.industry !== undefined) data.industry = input.industry?.slice(0, 100) || null;
    if (input.website !== undefined) data.website = input.website?.slice(0, 500) || null;
    if (input.targetMarket !== undefined) data.targetMarket = input.targetMarket?.slice(0, 1000) || null;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl?.slice(0, 1000) || null;
    if (input.autonomyMode !== undefined) data.autonomyMode = input.autonomyMode;

    return prisma.organization.update({ where: { id: companyId }, data });
  },

  /**
   * Set the autonomy mode for a company.
   */
  async setAutonomyMode(companyId: string, userId: string, mode: AutonomyMode) {
    return this.update(companyId, userId, { autonomyMode: mode });
  },
};

// ── Helpers ──

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || `company-${Date.now()}`;
}
