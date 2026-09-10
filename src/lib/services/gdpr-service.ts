import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── GDPR / Privacy Service ──
//
// Handles data subject rights: export, deletion, anonymization, consent
// management, and data subject access requests (DSAR).
//
// - Export records stored in Memory (type='gdpr_export')
// - Consent records stored in Memory (type='gdpr_consent')
// - Data requests use the existing DataRequest model
// - Audit events stored in the Event table

export type DataRequestType =
  | 'access'
  | 'correction'
  | 'deletion'
  | 'portability'
  | 'restriction'
  | 'objection';

export type DataRequestStatus = 'pending' | 'in_review' | 'completed' | 'rejected';

export type ConsentType = 'marketing' | 'analytics' | 'functional' | 'necessary';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface UserDataExport {
  userId: string;
  user: Record<string, unknown> | null;
  tasks: unknown[];
  goals: unknown[];
  projects: unknown[];
  events: unknown[];
  memories: unknown[];
  memberships: unknown[];
  exportedAt: Date;
}

export interface DataInventoryItem {
  entity: string;
  label: string;
  count: number;
  personalDataFields: string[];
}

export interface DataInventory {
  userId: string;
  items: DataInventoryItem[];
  totalRecords: number;
}

export interface GdprStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  totalExports: number;
  totalDeletions: number;
  consentRecords: number;
}

/** Parse a Memory row into a ConsentRecord. */
function parseConsentRecord(mem: {
  id: string;
  content: string;
  tags: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
}): ConsentRecord {
  let config: { userId: string; consentType: ConsentType; granted: boolean; grantedAt?: string | null; revokedAt?: string | null; metadata?: Record<string, unknown> };
  try {
    config = JSON.parse(mem.content);
  } catch {
    config = { userId: '', consentType: 'necessary', granted: false };
  }
  return {
    id: mem.id,
    userId: config.userId || mem.sourceId || mem.createdBy,
    consentType: config.consentType,
    granted: config.granted,
    grantedAt: config.grantedAt ? new Date(config.grantedAt) : null,
    revokedAt: config.revokedAt ? new Date(config.revokedAt) : null,
    metadata: config.metadata || {},
  };
}

/** Record an audit event in the Event table. */
async function recordAuditEvent(input: {
  organizationId?: string;
  workspaceId?: string;
  type: string;
  actor: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.event.create({
    data: {
      organizationId: input.organizationId || null,
      workspaceId: input.workspaceId || null,
      type: input.type,
      actor: input.actor,
      actorType: 'system',
      resourceType: input.resourceType || null,
      resourceId: input.resourceId || null,
      metadata: JSON.stringify(input.metadata || {}),
      source: 'gdpr',
    },
  }).catch(() => {});
}

export const GdprService = {
  /**
   * Export all data associated with a user (data portability right).
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await safePrisma(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          locale: true,
          country: true,
          currency: true,
          createdAt: true,
        },
      }),
    null);

    const [tasks, goals, projects, events, memories, memberships] = await Promise.all([
      safePrisma(() => prisma.task.findMany({ where: { assigneeId: userId }, take: 5000 }), []),
      safePrisma(() => prisma.goal.findMany({ where: { createdById: userId }, take: 5000 }), []),
      safePrisma(() => prisma.project.findMany({ where: { createdById: userId }, take: 5000 }), []),
      safePrisma(() => prisma.event.findMany({ where: { actor: userId }, take: 5000 }), []),
      safePrisma(() => prisma.memory.findMany({ where: { createdBy: userId }, take: 5000 }), []),
      safePrisma(() => prisma.membership.findMany({ where: { userId }, take: 500 }), []),
    ]);

    // Record audit event
    await recordAuditEvent({
      type: 'gdpr.export.completed',
      actor: userId,
      resourceType: 'user',
      resourceId: userId,
      metadata: { recordCount: tasks.length + goals.length + projects.length + events.length + memories.length },
    });

    return {
      userId,
      user,
      tasks,
      goals,
      projects,
      events,
      memories,
      memberships,
      exportedAt: new Date(),
    };
  },

  /**
   * Delete all data for a user. If anonymize is true, personally identifiable
   * fields are replaced with anonymized values rather than deleting rows.
   */
  async deleteUserData(userId: string, options?: { anonymize?: boolean }): Promise<{ deleted: boolean; anonymized: boolean; recordsAffected: number }> {
    const anonymize = options?.anonymize ?? false;

    if (anonymize) {
      return this.anonymizeUserData(userId);
    }

    // Hard delete: remove user's data
    let recordsAffected = 0;
    const taskResult = await prisma.task.deleteMany({ where: { assigneeId: userId } }).catch(() => ({ count: 0 }));
    recordsAffected += taskResult.count;
    const goalResult = await prisma.goal.deleteMany({ where: { createdById: userId } }).catch(() => ({ count: 0 }));
    recordsAffected += goalResult.count;
    const memResult = await prisma.memory.deleteMany({ where: { createdBy: userId } }).catch(() => ({ count: 0 }));
    recordsAffected += memResult.count;
    const eventResult = await prisma.event.deleteMany({ where: { actor: userId } }).catch(() => ({ count: 0 }));
    recordsAffected += eventResult.count;

    await recordAuditEvent({
      type: 'gdpr.deletion.completed',
      actor: userId,
      resourceType: 'user',
      resourceId: userId,
      metadata: { recordsAffected, anonymized: false },
    });

    return { deleted: true, anonymized: false, recordsAffected };
  },

  /**
   * Anonymize a user's data — replace PII with anonymized values.
   */
  async anonymizeUserData(userId: string): Promise<{ deleted: boolean; anonymized: boolean; recordsAffected: number }> {
    const anonymizedName = 'Anonymous User';
    const anonymizedEmail = `anonymized+${userId.slice(0, 8)}@deleted.local`;

    let recordsAffected = 0;

    // Anonymize user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: anonymizedName,
        email: anonymizedEmail,
        image: null,
        password: null,
        mfaSecret: null,
        mfaEnabled: false,
      },
    }).catch(() => {});
    recordsAffected += 1;

    // Anonymize tasks
    const taskResult = await prisma.task.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    }).catch(() => ({ count: 0 }));
    recordsAffected += taskResult.count;

    // Anonymize goals
    const goalResult = await prisma.goal.updateMany({
      where: { createdById: userId },
      data: { createdById: 'anonymized' },
    }).catch(() => ({ count: 0 }));
    recordsAffected += goalResult.count;

    // Anonymize memories
    const memResult = await prisma.memory.updateMany({
      where: { createdBy: userId },
      data: { createdBy: 'anonymized', owner: null },
    }).catch(() => ({ count: 0 }));
    recordsAffected += memResult.count;

    await recordAuditEvent({
      type: 'gdpr.anonymization.completed',
      actor: userId,
      resourceType: 'user',
      resourceId: userId,
      metadata: { recordsAffected },
    });

    return { deleted: false, anonymized: true, recordsAffected };
  },

  /**
   * Get a data inventory for a user — lists all entities that contain
   * their personal data with counts and field descriptions.
   */
  async getDataInventory(userId: string): Promise<DataInventory> {
    const [taskCount, goalCount, projectCount, eventCount, memCount, membershipCount] = await Promise.all([
      safePrisma(() => prisma.task.count({ where: { assigneeId: userId } }), 0),
      safePrisma(() => prisma.goal.count({ where: { createdById: userId } }), 0),
      safePrisma(() => prisma.project.count({ where: { createdById: userId } }), 0),
      safePrisma(() => prisma.event.count({ where: { actor: userId } }), 0),
      safePrisma(() => prisma.memory.count({ where: { createdBy: userId } }), 0),
      safePrisma(() => prisma.membership.count({ where: { userId } }), 0),
    ]);

    const items: DataInventoryItem[] = [
      { entity: 'user', label: 'User Profile', count: 1, personalDataFields: ['name', 'email', 'image', 'locale', 'country'] },
      { entity: 'task', label: 'Tasks', count: taskCount, personalDataFields: ['assigneeId', 'title', 'description'] },
      { entity: 'goal', label: 'Goals', count: goalCount, personalDataFields: ['createdById', 'title', 'description'] },
      { entity: 'project', label: 'Projects', count: projectCount, personalDataFields: ['createdById', 'name', 'description'] },
      { entity: 'event', label: 'Events', count: eventCount, personalDataFields: ['actor', 'metadata'] },
      { entity: 'memory', label: 'Memories', count: memCount, personalDataFields: ['createdBy', 'content', 'owner'] },
      { entity: 'membership', label: 'Memberships', count: membershipCount, personalDataFields: ['userId', 'role'] },
    ];

    const totalRecords = items.reduce((sum, i) => sum + i.count, 0);

    return { userId, items, totalRecords };
  },

  /**
   * Get the consent record for a user and consent type.
   */
  async getConsentRecord(userId: string, consentType?: ConsentType): Promise<ConsentRecord | ConsentRecord[] | null> {
    if (consentType) {
      const mem = await safePrisma(() =>
        prisma.memory.findFirst({
          where: { type: 'gdpr_consent', sourceId: userId, tags: { contains: consentType } },
        }),
      null);
      if (!mem) return null;
      return parseConsentRecord(mem);
    }

    const mems = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'gdpr_consent', sourceId: userId },
        take: 100,
      }),
    []);
    return mems.map(parseConsentRecord);
  },

  /**
   * Update (or create) a consent record for a user.
   */
  async updateConsent(input: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    organizationId?: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ConsentRecord> {
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'gdpr_consent', sourceId: input.userId, tags: { contains: input.consentType } },
      }),
    null);

    const config = {
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted,
      grantedAt: input.granted ? new Date().toISOString() : existing ? undefined : null,
      revokedAt: !input.granted ? new Date().toISOString() : undefined,
      metadata: input.metadata || {},
    };

    if (existing) {
      const mem = await prisma.memory.update({
        where: { id: existing.id },
        data: {
          content: JSON.stringify(config).slice(0, 10000),
          tags: JSON.stringify([input.consentType]),
        },
      });
      return parseConsentRecord(mem);
    }

    const mem = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || 'global',
        organizationId: input.organizationId || 'global',
        type: 'gdpr_consent',
        content: JSON.stringify(config).slice(0, 10000),
        source: 'gdpr',
        sourceId: input.userId,
        confidence: 0.5,
        owner: input.userId,
        lifecycle: 'permanent',
        tags: JSON.stringify([input.consentType]),
        createdBy: input.userId,
      },
    });
    return parseConsentRecord(mem);
  },

  /**
   * List all data subject access requests.
   */
  async getDataRequests(status?: DataRequestStatus): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    return safePrisma(() =>
      prisma.dataRequest.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Create a new data subject access request.
   */
  async createDataRequest(input: {
    userId?: string;
    type: DataRequestType;
    email: string;
    name?: string;
    details?: string;
  }): Promise<unknown> {
    return prisma.dataRequest.create({
      data: {
        userId: input.userId || null,
        type: input.type,
        email: input.email,
        name: input.name || null,
        details: input.details || null,
        status: 'pending',
      },
    });
  },

  /**
   * Process a data subject access request — update its status.
   */
  async processDataRequest(requestId: string, status: DataRequestStatus, processedBy?: string): Promise<unknown> {
    return prisma.dataRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(status === 'completed' && { updatedAt: new Date() }),
      },
    });
  },

  /**
   * Get aggregate GDPR stats.
   */
  async getStats(): Promise<GdprStats> {
    const [requests, exports, deletions, consents] = await Promise.all([
      safePrisma(() => prisma.dataRequest.findMany({ take: 1000 }), []),
      safePrisma(() => prisma.memory.count({ where: { type: 'gdpr_export' } }), 0),
      safePrisma(() => prisma.event.count({ where: { type: { startsWith: 'gdpr.deletion' } } }), 0),
      safePrisma(() => prisma.memory.count({ where: { type: 'gdpr_consent' } }), 0),
    ]);

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter((r: { status: string }) => r.status === 'pending').length,
      completedRequests: requests.filter((r: { status: string }) => r.status === 'completed').length,
      rejectedRequests: requests.filter((r: { status: string }) => r.status === 'rejected').length,
      totalExports: exports,
      totalDeletions: deletions,
      consentRecords: consents,
    };
  },
};
