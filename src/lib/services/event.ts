import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Event Service ──

export type ActorType = 'user' | 'agent' | 'system';

export const EventService = {
  /**
   * Emit an event. Events drive automations, notifications, analytics, and audit.
   */
  async emit(input: {
    workspaceId?: string;
    organizationId?: string;
    type: string;
    actor?: string;
    actorType?: ActorType;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    source?: string;
  }) {
    return prisma.event.create({
      data: {
        workspaceId: input.workspaceId || null,
        organizationId: input.organizationId || null,
        type: input.type.slice(0, 100),
        actor: input.actor || null,
        actorType: input.actorType || 'system',
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        metadata: JSON.stringify(input.metadata || {}).slice(0, 10000),
        correlationId: input.correlationId || null,
        source: input.source || 'system',
      },
    });
  },

  /**
   * List events for a workspace.
   */
  async list(workspaceId: string, filters?: { type?: string; actor?: string }, take: number = 100) {
    return safePrisma(() =>
      prisma.event.findMany({
        where: {
          workspaceId,
          ...(filters?.type && { type: filters.type }),
          ...(filters?.actor && { actor: filters.actor }),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 500),
      }),
    []);
  },

  /**
   * List events by correlation ID (for tracing a single operation across services).
   */
  async listByCorrelation(correlationId: string) {
    return safePrisma(() =>
      prisma.event.findMany({
        where: { correlationId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      }),
    []);
  },

  /**
   * List events for an organization (company-wide activity feed).
   */
  async listForOrganization(organizationId: string, take: number = 50) {
    return safePrisma(() =>
      prisma.event.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 500),
      }),
    []);
  },
};
