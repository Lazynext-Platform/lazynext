import { prisma } from '@/lib/prisma';

// ── Types ──

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

export interface WorkspaceWithRole {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  role: Role;
  defaultLocale: string;
  timezone: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  defaultLocale: string;
  timezone: string;
  memberCount: number;
  projectCount: number;
  role: Role;
}

// ── Helpers ──

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || `ws-${Date.now()}`;
}

function ensureUniqueSlug(base: string, existing?: string | null): string {
  if (!existing) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Workspace Service ──

export const WorkspaceService = {
  /**
   * List all workspaces a user is a member of, with their role.
   */
  async listForUser(userId: string): Promise<WorkspaceWithRole[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships
      .filter((m) => m.workspace.deletedAt === null)
      .map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        organizationId: m.workspace.organizationId,
        role: m.role as Role,
        defaultLocale: m.workspace.defaultLocale,
        timezone: m.workspace.timezone,
      }));
  },

  /**
   * Get a single workspace with details for the current user.
   */
  async getForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null> {
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: {
        workspace: {
          include: {
            _count: {
              select: { memberships: true, projects: true },
            },
          },
        },
      },
    });
    if (!membership || membership.workspace.deletedAt) return null;
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      organizationId: membership.workspace.organizationId,
      defaultLocale: membership.workspace.defaultLocale,
      timezone: membership.workspace.timezone,
      memberCount: membership.workspace._count.memberships,
      projectCount: membership.workspace._count.projects,
      role: membership.role as Role,
    };
  },

  /**
   * Ensure a user has a default organization + workspace.
   * Called on first login or signup. Idempotent.
   */
  async ensureDefaultWorkspace(userId: string, userName?: string | null): Promise<WorkspaceWithRole> {
    // Check if user already has any workspace
    const existing = await this.listForUser(userId);
    if (existing.length > 0) return existing[0];

    // Create a personal organization + workspace
    const name = userName || 'Personal';
    const baseSlug = slugify(name);
    const orgSlug = ensureUniqueSlug(baseSlug, await this.orgSlugExists(baseSlug));
    const wsSlug = ensureUniqueSlug(baseSlug, await this.wsSlugExists(baseSlug));

    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Organization`,
        slug: orgSlug,
        ownerId: userId,
        plan: 'free',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: `${name}'s Workspace`,
        slug: wsSlug,
      },
    });

    await prisma.membership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      organizationId: org.id,
      role: 'owner',
      defaultLocale: workspace.defaultLocale,
      timezone: workspace.timezone,
    };
  },

  /**
   * Create a new workspace within an existing organization.
   */
  async create(userId: string, name: string, organizationId?: string): Promise<WorkspaceWithRole> {
    let orgId = organizationId;

    // If no org provided, use the user's first org or create one
    if (!orgId) {
      const orgs = await prisma.organization.findMany({ where: { ownerId: userId } });
      if (orgs.length > 0) {
        orgId = orgs[0].id;
      } else {
        const baseSlug = slugify(name);
        const orgSlug = ensureUniqueSlug(baseSlug, await this.orgSlugExists(baseSlug));
        const org = await prisma.organization.create({
          data: { name: `${name} Organization`, slug: orgSlug, ownerId: userId },
        });
        orgId = org.id;
      }
    }

    // Verify the user owns the org
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.ownerId !== userId) {
      throw new Error('Not authorized to create workspace in this organization');
    }

    const baseSlug = slugify(name);
    const wsSlug = ensureUniqueSlug(baseSlug, await this.wsSlugExists(baseSlug));

    const workspace = await prisma.workspace.create({
      data: { organizationId: orgId, name, slug: wsSlug },
    });

    await prisma.membership.create({
      data: { userId, workspaceId: workspace.id, role: 'owner' },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      organizationId: orgId,
      role: 'owner',
      defaultLocale: workspace.defaultLocale,
      timezone: workspace.timezone,
    };
  },

  /**
   * List members of a workspace.
   */
  async listMembers(workspaceId: string, _userId: string) {
    // Verify membership
    const membership = await prisma.membership.findFirst({
      where: { workspaceId, userId: _userId },
    });
    if (!membership) throw new Error('Not a member of this workspace');

    const members = await prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role as Role,
      user: m.user,
      createdAt: m.createdAt,
    }));
  },

  /**
   * Invite a member to a workspace (by creating a membership directly —
   * email-based invitations will be added in a later phase).
   */
  async addMember(workspaceId: string, requesterId: string, targetUserId: string, role: Role = 'member'): Promise<void> {
    const requesterMembership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      throw new Error('Not authorized to add members');
    }

    await prisma.membership.create({
      data: { userId: targetUserId, workspaceId, role },
    });
  },

  /**
   * Update a member's role.
   */
  async updateMemberRole(
    workspaceId: string,
    requesterId: string,
    targetUserId: string,
    role: Role,
  ): Promise<void> {
    const requesterMembership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      throw new Error('Not authorized to update member roles');
    }

    await prisma.membership.update({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      data: { role },
    });
  },

  /**
   * Remove a member from a workspace.
   */
  async removeMember(workspaceId: string, requesterId: string, targetUserId: string): Promise<void> {
    const requesterMembership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      throw new Error('Not authorized to remove members');
    }
    if (requesterMembership.role === 'owner') {
      // Owner can't be removed
      const target = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      });
      if (target?.role === 'owner') {
        throw new Error('Cannot remove the owner of the workspace');
      }
    }

    await prisma.membership.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
  },

  // ── Internal slug helpers ──
  async orgSlugExists(slug: string): Promise<string | null> {
    const existing = await prisma.organization.findUnique({ where: { slug }, select: { slug: true } });
    return existing?.slug ?? null;
  },
  async wsSlugExists(slug: string): Promise<string | null> {
    const existing = await prisma.workspace.findUnique({ where: { slug }, select: { slug: true } });
    return existing?.slug ?? null;
  },
};
