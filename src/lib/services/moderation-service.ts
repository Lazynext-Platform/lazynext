import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type FlagStatus = 'pending' | 'resolved';
export type FlagSeverity = 'low' | 'medium' | 'high';
export type ResolveAction = 'approved' | 'removed' | 'warning';

/** Raw Memory row as stored in the database. */
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

/** Parsed content payload for a moderation flag. */
interface FlagContent {
  messageId: string;
  flaggedBy: string;
  reason: string;
  status: FlagStatus;
  severity: FlagSeverity;
  resolvedBy: string | null;
  resolvedAt: string | null;
  action: ResolveAction | null;
}

/** A structured moderation flag returned to callers. */
export interface ModerationFlag {
  id: string;
  organizationId: string;
  messageId: string;
  flaggedBy: string;
  reason: string;
  status: FlagStatus;
  severity: FlagSeverity;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  action: ResolveAction | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Parsed content payload for a moderation log entry. */
interface LogContent {
  action: string;
  targetId: string;
  actorId: string;
  reason: string;
  metadata: Record<string, unknown>;
}

/** A structured moderation log entry. */
export interface ModerationLogEntry {
  id: string;
  organizationId: string;
  action: string;
  targetId: string;
  actorId: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Parsed content payload for a mute record. */
interface MuteContent {
  userId: string;
  mutedBy: string;
  reason: string;
  expiresAt: string | null;
  active: boolean;
}

/** A structured mute record. */
export interface MuteRecord {
  id: string;
  organizationId: string;
  userId: string;
  mutedBy: string;
  reason: string;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}

export interface ListFlagOpts {
  status?: FlagStatus;
  severity?: FlagSeverity;
}

export interface ListLogOpts {
  action?: string;
  limit?: number;
}

export interface ModerationStats {
  totalFlags: number;
  resolvedFlags: number;
  pendingFlags: number;
  deletedMessages: number;
  mutedUsers: number;
}

// ── Helpers ──

const fallbackFlagContent: FlagContent = {
  messageId: '',
  flaggedBy: '',
  reason: '',
  status: 'pending',
  severity: 'low',
  resolvedBy: null,
  resolvedAt: null,
  action: null,
};

function parseFlagContent(raw: string): FlagContent {
  if (!raw) return fallbackFlagContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      messageId: parsed.messageId ?? '',
      flaggedBy: parsed.flaggedBy ?? '',
      reason: parsed.reason ?? '',
      status: (parsed.status as FlagStatus) ?? 'pending',
      severity: (parsed.severity as FlagSeverity) ?? 'low',
      resolvedBy: parsed.resolvedBy ?? null,
      resolvedAt: parsed.resolvedAt ?? null,
      action: (parsed.action as ResolveAction) ?? null,
    };
  } catch {
    return fallbackFlagContent;
  }
}

function toFlag(row: MemoryRow): ModerationFlag {
  const content = parseFlagContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    messageId: content.messageId,
    flaggedBy: content.flaggedBy,
    reason: content.reason,
    status: content.status,
    severity: content.severity,
    resolvedBy: content.resolvedBy,
    resolvedAt: content.resolvedAt ? new Date(content.resolvedAt) : null,
    action: content.action,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseLogContent(raw: string): LogContent {
  const fallback: LogContent = {
    action: '',
    targetId: '',
    actorId: '',
    reason: '',
    metadata: {},
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      action: parsed.action ?? '',
      targetId: parsed.targetId ?? '',
      actorId: parsed.actorId ?? '',
      reason: parsed.reason ?? '',
      metadata: parsed.metadata ?? {},
    };
  } catch {
    return fallback;
  }
}

function toLogEntry(row: MemoryRow): ModerationLogEntry {
  const content = parseLogContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    action: content.action,
    targetId: content.targetId,
    actorId: content.actorId,
    reason: content.reason,
    metadata: content.metadata,
    createdAt: row.createdAt,
  };
}

function parseMuteContent(raw: string): MuteContent {
  const fallback: MuteContent = {
    userId: '',
    mutedBy: '',
    reason: '',
    expiresAt: null,
    active: true,
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      userId: parsed.userId ?? '',
      mutedBy: parsed.mutedBy ?? '',
      reason: parsed.reason ?? '',
      expiresAt: parsed.expiresAt ?? null,
      active: parsed.active ?? true,
    };
  } catch {
    return fallback;
  }
}

function toMuteRecord(row: MemoryRow): MuteRecord {
  const content = parseMuteContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: content.userId,
    mutedBy: content.mutedBy,
    reason: content.reason,
    expiresAt: content.expiresAt ? new Date(content.expiresAt) : null,
    active: content.active,
    createdAt: row.createdAt,
  };
}

// ── Moderation Service ──

export const ModerationService = {
  /**
   * Flag a message for moderation. Stored as a Memory with type='moderation_flag'.
   */
  async flagMessage(
    messageId: string,
    flaggedBy: string,
    reason: string,
    severity: FlagSeverity = 'medium',
  ): Promise<ModerationFlag> {
    // Look up the message to get its organizationId
    const message = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: messageId } }),
    null,
    );

    const organizationId = (message as MemoryRow | null)?.organizationId || 'unknown';
    const workspaceId = (message as MemoryRow | null)?.workspaceId || organizationId;

    const content: FlagContent = {
      messageId,
      flaggedBy,
      reason,
      status: 'pending',
      severity,
      resolvedBy: null,
      resolvedAt: null,
      action: null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'moderation_flag',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: `message:${messageId}`,
        confidence: 1.0,
        lifecycle: 'long',
        tags: JSON.stringify(['moderation_flag', severity]),
        createdBy: flaggedBy,
      },
    });

    return toFlag(row as MemoryRow);
  },

  /**
   * List flagged messages with optional filters.
   */
  async getFlags(organizationId: string, opts: ListFlagOpts = {}): Promise<ModerationFlag[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'moderation_flag',
          organizationId,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    [],
    );

    let flags = rows.map((r) => toFlag(r as MemoryRow));

    if (opts.status) {
      flags = flags.filter((f) => f.status === opts.status);
    }
    if (opts.severity) {
      flags = flags.filter((f) => f.severity === opts.severity);
    }

    return flags;
  },

  /**
   * Resolve a moderation flag.
   */
  async resolveFlag(
    flagId: string,
    resolvedBy: string,
    action: ResolveAction,
  ): Promise<ModerationFlag | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: flagId } }),
    null,
    );
    if (!existing) return null;

    const content = parseFlagContent(existing.content);
    content.status = 'resolved';
    content.resolvedBy = resolvedBy;
    content.resolvedAt = new Date().toISOString();
    content.action = action;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: flagId },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;

    // Log the resolution
    await ModerationService._log(
      (existing as MemoryRow).organizationId,
      (existing as MemoryRow).workspaceId,
      'flag_resolved',
      flagId,
      resolvedBy,
      `Flag resolved with action: ${action}`,
      { action, messageId: content.messageId },
    );

    return toFlag(row as MemoryRow);
  },

  /**
   * Delete a message with an audit trail.
   */
  async deleteMessage(
    messageId: string,
    deletedBy: string,
    reason: string,
  ): Promise<boolean> {
    const message = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: messageId } }),
    null,
    );
    if (!message) return false;

    const organizationId = (message as MemoryRow).organizationId;
    const workspaceId = (message as MemoryRow).workspaceId;

    try {
      await prisma.memory.delete({ where: { id: messageId } });
    } catch {
      return false;
    }

    // Log the deletion
    await ModerationService._log(
      organizationId,
      workspaceId,
      'message_deleted',
      messageId,
      deletedBy,
      reason,
      {},
    );

    return true;
  },

  /**
   * Mute a user. Stored as a Memory with type='moderation_mute'.
   */
  async muteUser(
    userId: string,
    mutedBy: string,
    duration?: number,
    reason: string = '',
  ): Promise<MuteRecord> {
    // Find the organization from the muter's context
    const existingMute = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'moderation_mute', sourceId: `user:${userId}` },
      }),
    null,
    );

    const organizationId = (existingMute as MemoryRow | null)?.organizationId || 'unknown';
    const workspaceId = (existingMute as MemoryRow | null)?.workspaceId || organizationId;

    const expiresAt = duration
      ? new Date(Date.now() + duration * 60 * 1000).toISOString()
      : null;

    const content: MuteContent = {
      userId,
      mutedBy,
      reason,
      expiresAt,
      active: true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'moderation_mute',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: `user:${userId}`,
        confidence: 1.0,
        lifecycle: 'long',
        tags: JSON.stringify(['moderation_mute']),
        createdBy: mutedBy,
      },
    });

    await ModerationService._log(
      organizationId,
      workspaceId,
      'user_muted',
      userId,
      mutedBy,
      reason,
      { duration, expiresAt },
    );

    return toMuteRecord(row as MemoryRow);
  },

  /**
   * Unmute a user — marks all active mutes as inactive.
   */
  async unmuteUser(userId: string): Promise<boolean> {
    const mutes = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'moderation_mute', sourceId: `user:${userId}` },
        take: 100,
      }),
    [],
    );

    if (mutes.length === 0) return false;

    for (const m of mutes) {
      const content = parseMuteContent((m as MemoryRow).content);
      if (!content.active) continue;
      content.active = false;
      await safePrisma(() =>
        prisma.memory.update({
          where: { id: (m as MemoryRow).id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
      );
    }

    return true;
  },

  /**
   * Check if a user is currently muted.
   */
  async isMuted(userId: string): Promise<boolean> {
    const mutes = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'moderation_mute', sourceId: `user:${userId}` },
        take: 100,
      }),
    [],
    );

    const now = Date.now();
    for (const m of mutes) {
      const content = parseMuteContent((m as MemoryRow).content);
      if (!content.active) continue;
      // If no expiry, user is permanently muted
      if (!content.expiresAt) return true;
      // If expiry hasn't passed, user is still muted
      if (new Date(content.expiresAt).getTime() > now) return true;
    }

    return false;
  },

  /**
   * Get the moderation action log.
   */
  async getModerationLog(organizationId: string, opts: ListLogOpts = {}): Promise<ModerationLogEntry[]> {
    const limit = Math.min(opts.limit ?? 100, 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'moderation_log',
          organizationId,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    [],
    );

    let entries = rows.map((r) => toLogEntry(r as MemoryRow));

    if (opts.action) {
      entries = entries.filter((e) => e.action === opts.action);
    }

    return entries;
  },

  /**
   * Get moderation stats for an organization.
   */
  async getStats(organizationId: string): Promise<ModerationStats> {
    const [flags, logs, mutes] = await Promise.all([
      safePrisma(() =>
        prisma.memory.findMany({
          where: { type: 'moderation_flag', organizationId },
          take: 1000,
        }),
      [],
      ),
      safePrisma(() =>
        prisma.memory.findMany({
          where: { type: 'moderation_log', organizationId },
          take: 1000,
        }),
      [],
      ),
      safePrisma(() =>
        prisma.memory.findMany({
          where: { type: 'moderation_mute', organizationId },
          take: 1000,
        }),
      [],
      ),
    ]);

    const flagRecords = flags.map((r) => toFlag(r as MemoryRow));
    const resolvedFlags = flagRecords.filter((f) => f.status === 'resolved').length;
    const pendingFlags = flagRecords.filter((f) => f.status === 'pending').length;
    const deletedMessages = logs
      .map((r) => toLogEntry(r as MemoryRow))
      .filter((e) => e.action === 'message_deleted').length;

    const now = Date.now();
    const mutedUsers = mutes
      .map((r) => toMuteRecord(r as MemoryRow))
      .filter((m) => {
        if (!m.active) return false;
        if (!m.expiresAt) return true;
        return m.expiresAt.getTime() > now;
      }).length;

    return {
      totalFlags: flagRecords.length,
      resolvedFlags,
      pendingFlags,
      deletedMessages,
      mutedUsers,
    };
  },

  // ── Internal helper: write a moderation log entry ──

  async _log(
    organizationId: string,
    workspaceId: string,
    action: string,
    targetId: string,
    actorId: string,
    reason: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const content: LogContent = {
      action,
      targetId,
      actorId,
      reason,
      metadata,
    };

    await safePrisma(() =>
      prisma.memory.create({
        data: {
          workspaceId,
          organizationId,
          type: 'moderation_log',
          content: JSON.stringify(content).slice(0, 10000),
          source: 'system',
          sourceId: targetId,
          confidence: 1.0,
          lifecycle: 'long',
          tags: JSON.stringify(['moderation_log', action]),
          createdBy: actorId,
        },
      }),
    null,
    );
  },
};
