import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

/** Raw Event row as stored in the database. */
interface EventRow {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  actor: string | null;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string;
  correlationId: string | null;
  source: string;
  createdAt: Date;
}

/** Presence heartbeat payload stored in Event.metadata. */
interface HeartbeatData {
  status: PresenceStatus;
  lastSeen: string;
}

/** A user's presence in a workspace. */
export interface PresenceRecord {
  userId: string;
  status: PresenceStatus;
  lastSeen: Date;
}

/** A user currently viewing a resource. */
export interface ViewingRecord {
  userId: string;
  resourceType: string;
  resourceId: string;
  since: Date;
}

/** A structured activity feed item. */
export interface ActivityItem {
  id: string;
  type: string;
  userId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Presence stats for a workspace. */
export interface PresenceStats {
  onlineCount: number;
  activeUsers: number;
  viewingCount: number;
}

export interface ActivityFeedOpts {
  workspaceId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  types?: string[];
}

// ── Constants ──

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const AWAY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const VIEWING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// ── Helpers ──

function parseHeartbeat(raw: string): HeartbeatData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      status: parsed.status ?? 'online',
      lastSeen: parsed.lastSeen ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function deriveStatus(lastSeen: Date, explicitStatus?: PresenceStatus): PresenceStatus {
  const elapsed = Date.now() - lastSeen.getTime();
  if (elapsed > AWAY_THRESHOLD_MS) return 'offline';
  if (elapsed > ONLINE_THRESHOLD_MS) return 'away';
  return explicitStatus ?? 'online';
}

// ── Presence Service ──

export const PresenceService = {
  /**
   * Record a presence heartbeat. Stored as an Event with type='presence',
   * source='heartbeat'.
   */
  async heartbeat(
    organizationId: string,
    workspaceId: string,
    userId: string,
    status: PresenceStatus = 'online',
  ): Promise<boolean> {
    const data: HeartbeatData = {
      status,
      lastSeen: new Date().toISOString(),
    };

    try {
      await prisma.event.create({
        data: {
          workspaceId,
          organizationId,
          type: 'presence',
          actor: userId,
          actorType: 'user',
          resourceType: null,
          resourceId: null,
          metadata: JSON.stringify(data).slice(0, 10000),
          correlationId: `${workspaceId}:${userId}`,
          source: 'heartbeat',
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get presence for all users in a workspace. Queries recent heartbeat
   * events and derives status from recency.
   */
  async getPresence(workspaceId: string): Promise<PresenceRecord[]> {
    const since = new Date(Date.now() - AWAY_THRESHOLD_MS);
    const rows = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          type: 'presence',
          source: 'heartbeat',
          workspaceId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    [],
    );

    // Keep only the most recent heartbeat per user.
    const byUser = new Map<string, { lastSeen: Date; status: PresenceStatus }>();
    for (const r of rows) {
      const row = r as EventRow;
      const userId = row.actor;
      if (!userId || byUser.has(userId)) continue;
      const hb = parseHeartbeat(row.metadata);
      byUser.set(userId, {
        lastSeen: new Date(hb?.lastSeen || row.createdAt),
        status: hb?.status || 'online',
      });
    }

    return Array.from(byUser.entries()).map(([userId, info]) => ({
      userId,
      status: deriveStatus(info.lastSeen, info.status),
      lastSeen: info.lastSeen,
    }));
  },

  /**
   * Get a single user's presence (across all workspaces).
   */
  async getUserPresence(userId: string): Promise<PresenceRecord | null> {
    const rows = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          type: 'presence',
          source: 'heartbeat',
          actor: userId,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    [],
    );

    if (rows.length === 0) return null;
    const row = rows[0] as EventRow;
    const hb = parseHeartbeat(row.metadata);
    const lastSeen = new Date(hb?.lastSeen || row.createdAt);
    return {
      userId,
      status: deriveStatus(lastSeen, hb?.status),
      lastSeen,
    };
  },

  /**
   * Manually set a user's status. Records a heartbeat with the given status.
   */
  async setStatus(userId: string, status: PresenceStatus): Promise<boolean> {
    // Find the user's most recent heartbeat to get org/workspace context.
    const recent = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          type: 'presence',
          source: 'heartbeat',
          actor: userId,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    [],
    );

    const last = recent[0] as EventRow | undefined;
    const workspaceId = last?.workspaceId || 'unknown';
    const organizationId = last?.organizationId || 'unknown';

    return PresenceService.heartbeat(organizationId, workspaceId, userId, status);
  },

  /**
   * Count online users in a workspace.
   */
  async getOnlineCount(workspaceId: string): Promise<number> {
    const presence = await PresenceService.getPresence(workspaceId);
    return presence.filter((p) => p.status === 'online').length;
  },

  /**
   * Get users currently viewing a resource. Queries viewing events from
   * the last 2 minutes.
   */
  async getViewing(
    resourceType: string,
    resourceId: string,
    workspaceId: string,
  ): Promise<ViewingRecord[]> {
    const since = new Date(Date.now() - VIEWING_THRESHOLD_MS);
    const rows = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          type: 'presence',
          source: 'viewing',
          workspaceId,
          resourceType,
          resourceId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    [],
    );

    // Keep only the most recent viewing event per user.
    const byUser = new Map<string, Date>();
    for (const r of rows) {
      const row = r as EventRow;
      const userId = row.actor;
      if (!userId || byUser.has(userId)) continue;
      byUser.set(userId, row.createdAt);
    }

    return Array.from(byUser.entries()).map(([userId, since]) => ({
      userId,
      resourceType,
      resourceId,
      since,
    }));
  },

  /**
   * Record that a user started viewing a resource.
   */
  async startViewing(
    organizationId: string,
    workspaceId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      await prisma.event.create({
        data: {
          workspaceId,
          organizationId,
          type: 'presence',
          actor: userId,
          actorType: 'user',
          resourceType,
          resourceId,
          metadata: JSON.stringify({ startedAt: new Date().toISOString() }).slice(0, 10000),
          correlationId: `${resourceType}:${resourceId}`,
          source: 'viewing',
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Record that a user stopped viewing a resource.
   */
  async stopViewing(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
    try {
      await prisma.event.deleteMany({
        where: {
          type: 'presence',
          source: 'viewing',
          actor: userId,
          resourceType,
          resourceId,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get an activity feed for an organization. Queries recent events of
   * various types.
   */
  async getActivityFeed(organizationId: string, opts: ActivityFeedOpts = {}): Promise<ActivityItem[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const offset = Math.max(opts.offset ?? 0, 0);

    const rows = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
          ...(opts.userId ? { actor: opts.userId } : {}),
          ...(opts.types && opts.types.length > 0 ? { type: { in: opts.types } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    [],
    );

    return rows.map((r) => {
      const row = r as EventRow;
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = {};
      }
      return {
        id: row.id,
        type: row.type,
        userId: row.actor,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        workspaceId: row.workspaceId,
        organizationId: row.organizationId,
        metadata,
        createdAt: row.createdAt,
      };
    });
  },

  /**
   * Get presence stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<PresenceStats> {
    const presence = await PresenceService.getPresence(workspaceId);
    const onlineCount = presence.filter((p) => p.status === 'online').length;

    // Count active users (any presence record in the last 15 min).
    const activeUsers = presence.length;

    // Count current viewing events.
    const since = new Date(Date.now() - VIEWING_THRESHOLD_MS);
    const viewingRows = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          type: 'presence',
          source: 'viewing',
          workspaceId,
          createdAt: { gte: since },
        },
        take: 500,
      }),
    [],
    );

    // Unique users viewing.
    const viewingUsers = new Set<string>();
    for (const r of viewingRows) {
      const actor = (r as EventRow).actor;
      if (actor) viewingUsers.add(actor);
    }

    return {
      onlineCount,
      activeUsers,
      viewingCount: viewingUsers.size,
    };
  },
};
