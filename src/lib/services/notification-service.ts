import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { sendNotificationEmail } from '@/lib/email';
import {
  type NotificationType,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationPreferences,
  TYPE_TO_CATEGORY,
  getDefaultPreferences,
} from './notification-defaults';

// ── Notification Service ──
//
// The Notification model (prisma/schema.prisma) only has: id, userId,
// workspaceId, type, title, body, read, createdAt. The extra structured
// fields (category, priority, actionUrl, metadata, organizationId,
// createdBy, archived) are encoded as a JSON envelope inside the `body`
// column. This keeps the schema untouched while exposing a rich API.

/** Envelope stored in the Notification.body column. */
interface NotificationEnvelope {
  text: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  organizationId: string | null;
  createdBy: string | null;
  archived: boolean;
}

/** A parsed notification with decoded envelope fields. */
export interface ParsedNotification {
  id: string;
  userId: string;
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  title: string;
  body: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  archived: boolean;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string;
  organizationId?: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  /** Whether to attempt email delivery (default: true). */
  sendEmail?: boolean;
}

export interface ListOptions {
  unreadOnly?: boolean;
  category?: NotificationCategory;
  type?: string;
  dateRange?: { start?: Date; end?: Date };
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

export interface DigestResult {
  totalUnread: number;
  byCategory: Record<string, { count: number; items: ParsedNotification[] }>;
  topItems: ParsedNotification[];
  period: { start: Date; end: Date };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

// ── Envelope (de)serialization ──

function buildEnvelope(input: CreateNotificationInput): string {
  const category = input.category || TYPE_TO_CATEGORY[input.type as NotificationType] || 'system';
  const envelope: NotificationEnvelope = {
    text: input.body ?? null,
    category,
    priority: input.priority || 'normal',
    actionUrl: input.actionUrl ?? null,
    metadata: input.metadata || {},
    organizationId: input.organizationId ?? null,
    createdBy: input.createdBy ?? null,
    archived: false,
  };
  return JSON.stringify(envelope);
}

function parseEnvelope(raw: string | null): NotificationEnvelope {
  const fallback: NotificationEnvelope = {
    text: raw,
    category: 'system',
    priority: 'normal',
    actionUrl: null,
    metadata: {},
    organizationId: null,
    createdBy: null,
    archived: false,
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'category' in parsed) {
      return {
        text: parsed.text ?? null,
        category: parsed.category ?? 'system',
        priority: parsed.priority ?? 'normal',
        actionUrl: parsed.actionUrl ?? null,
        metadata: parsed.metadata ?? {},
        organizationId: parsed.organizationId ?? null,
        createdBy: parsed.createdBy ?? null,
        archived: parsed.archived ?? false,
      };
    }
    // Not an envelope — treat as plain text body (backward compat).
    return { ...fallback, text: raw };
  } catch {
    return fallback;
  }
}

function toParsed(row: {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
}): ParsedNotification {
  const env = parseEnvelope(row.body);
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    organizationId: env.organizationId,
    type: row.type,
    title: row.title,
    body: env.text,
    category: env.category,
    priority: env.priority,
    actionUrl: env.actionUrl,
    metadata: env.metadata,
    createdBy: env.createdBy,
    archived: env.archived,
    read: row.read,
    createdAt: row.createdAt,
  };
}

// ── Preferences helpers ──

async function readPrefs(userId: string): Promise<NotificationPreferences> {
  const user = await safePrisma(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    }),
  null,
  );
  if (!user?.notificationPrefs) return getDefaultPreferences();
  try {
    const parsed = JSON.parse(user.notificationPrefs);
    return { ...getDefaultPreferences(), ...parsed };
  } catch {
    return getDefaultPreferences();
  }
}

/** Check whether a notification type is enabled for in-app delivery. */
function isInAppEnabled(prefs: NotificationPreferences, type: string): boolean {
  if (!prefs.inAppEnabled) return false;
  const t = prefs.types[type as NotificationType];
  if (t) return t.inApp;
  return true; // unknown types default to enabled
}

/** Check whether a notification type is enabled for email delivery. */
function isEmailEnabled(prefs: NotificationPreferences, type: string): boolean {
  if (!prefs.emailEnabled) return false;
  const t = prefs.types[type as NotificationType];
  if (t) return t.email;
  return false; // unknown types default to no email
}

// ── NotificationService ──

export const NotificationService = {
  /**
   * Create a notification. Checks the recipient's notification preferences
   * before creating — if the user has disabled in-app delivery for this
   * type, the notification is skipped (returns null). Email delivery is
   * attempted when enabled.
   */
  async create(input: CreateNotificationInput): Promise<ParsedNotification | null> {
    const prefs = await readPrefs(input.userId);
    if (!isInAppEnabled(prefs, input.type)) {
      // User has disabled in-app for this type — skip creation.
      return null;
    }

    const bodyEnvelope = buildEnvelope(input);
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId || null,
        type: input.type.slice(0, 100),
        title: input.title.slice(0, 200),
        body: bodyEnvelope,
      },
    });

    // Attempt email delivery if enabled for this type.
    if (input.sendEmail !== false && isEmailEnabled(prefs, input.type)) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { email: true },
        });
        if (user?.email) {
          await sendNotificationEmail(user.email, input.title, input.body || null, input.type);
        }
      } catch (err) {
        console.error('[notification-service] Email delivery failed:', err);
      }
    }

    return toParsed(row);
  },

  /**
   * Create a notification for all members of a workspace.
   */
  async createForWorkspace(workspaceId: string, input: Omit<CreateNotificationInput, 'userId' | 'workspaceId'>) {
    const memberships = await safePrisma(() =>
      prisma.membership.findMany({
        where: { workspaceId },
        select: { userId: true },
      }),
    [],
    );
    const userIds = memberships.map((m) => m.userId);
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        NotificationService.create({ ...input, userId, workspaceId }),
      ),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<ParsedNotification | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((n): n is ParsedNotification => n !== null);
  },

  /**
   * Create a notification for all members of an organization (across all
   * workspaces owned by the org).
   */
  async createForOrganization(organizationId: string, input: Omit<CreateNotificationInput, 'userId' | 'organizationId'>) {
    const workspaces = await safePrisma(() =>
      prisma.workspace.findMany({
        where: { organizationId },
        select: { id: true },
      }),
    [],
    );
    const wsIds = workspaces.map((w) => w.id);
    if (wsIds.length === 0) return [];

    const memberships = await safePrisma(() =>
      prisma.membership.findMany({
        where: { workspaceId: { in: wsIds } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    [],
    );
    const userIds = memberships.map((m) => m.userId);
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        NotificationService.create({ ...input, userId, organizationId }),
      ),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<ParsedNotification | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((n): n is ParsedNotification => n !== null);
  },

  /**
   * List notifications for a user with optional filters.
   */
  async list(userId: string, opts: ListOptions = {}): Promise<ParsedNotification[]> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const offset = Math.max(opts.offset ?? 0, 0);

    const rows = await safePrisma(() =>
      prisma.notification.findMany({
        where: {
          userId,
          ...(opts.unreadOnly ? { read: false } : {}),
          ...(opts.type ? { type: opts.type } : {}),
          ...(opts.dateRange?.start ? { createdAt: { gte: opts.dateRange.start } } : {}),
          ...(opts.dateRange?.end ? { createdAt: { lte: opts.dateRange.end } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    [],
    );

    let parsed = rows.map(toParsed);

    // Filter by category (stored in envelope) and archived flag.
    if (opts.category) {
      parsed = parsed.filter((n) => n.category === opts.category);
    }
    if (!opts.includeArchived) {
      parsed = parsed.filter((n) => !n.archived);
    }

    return parsed;
  },

  /**
   * Get the unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return safePrisma(() =>
      prisma.notification.count({
        where: { userId, read: false },
      }),
    0,
    );
  },

  /**
   * Get unread counts grouped by category.
   */
  async getCountsByCategory(userId: string): Promise<Record<string, number>> {
    const rows = await safePrisma(() =>
      prisma.notification.findMany({
        where: { userId, read: false },
        select: { body: true },
      }),
    [],
    );
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const env = parseEnvelope(row.body);
      if (env.archived) continue;
      counts[env.category] = (counts[env.category] || 0) + 1;
    }
    return counts;
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string) {
    return safePrisma(() =>
      prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      }),
    null,
    );
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await safePrisma(() =>
      prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      }),
    { count: 0 },
    );
    return result.count;
  },

  /**
   * Mark a single notification as unread.
   */
  async markAsUnread(notificationId: string) {
    return safePrisma(() =>
      prisma.notification.update({
        where: { id: notificationId },
        data: { read: false },
      }),
    null,
    );
  },

  /**
   * Delete a notification.
   */
  async delete(notificationId: string) {
    return safePrisma(() =>
      prisma.notification.delete({
        where: { id: notificationId },
      }),
    null,
    );
  },

  /**
   * Archive a notification (sets archived=true in the body envelope).
   */
  async archive(notificationId: string) {
    const row = await safePrisma(() =>
      prisma.notification.findUnique({
        where: { id: notificationId },
      }),
    null,
    );
    if (!row) return null;
    const env = parseEnvelope(row.body);
    env.archived = true;
    return safePrisma(() =>
      prisma.notification.update({
        where: { id: notificationId },
        data: { body: JSON.stringify(env) },
      }),
    null,
    );
  },

  /**
   * Get a digest of notifications for email summarization.
   */
  async getDigest(userId: string, opts: { since?: Date; includeRead?: boolean } = {}): Promise<DigestResult> {
    const end = new Date();
    const start = opts.since ?? new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const rows = await safePrisma(() =>
      prisma.notification.findMany({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
          ...(opts.includeRead ? {} : { read: false }),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    [],
    );

    const items = rows.map(toParsed).filter((n) => !n.archived);
    const byCategory: Record<string, { count: number; items: ParsedNotification[] }> = {};
    for (const n of items) {
      if (!byCategory[n.category]) byCategory[n.category] = { count: 0, items: [] };
      byCategory[n.category].count += 1;
      byCategory[n.category].items.push(n);
    }

    return {
      totalUnread: items.filter((n) => !n.read).length,
      byCategory,
      topItems: items.slice(0, 10),
      period: { start, end },
    };
  },

  /**
   * Prepare and send a digest email. Uses Resend if available; otherwise
   * returns the digest data so the caller can deliver it via another channel.
   */
  async sendDigestEmail(userId: string): Promise<{ sent: boolean; digest: DigestResult }> {
    const digest = await NotificationService.getDigest(userId);
    const user = await safePrisma(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, notificationPrefs: true },
      }),
    null,
    );

    if (!user?.email) return { sent: false, digest };

    // Respect the user's digest frequency — only send if there are items.
    if (digest.topItems.length === 0) return { sent: false, digest };

    let sent = false;
    try {
      sent = await sendNotificationEmail(
        user.email,
        `Your Lazynext digest — ${digest.totalUnread} unread`,
        digest.topItems.map((n) => `• ${n.title}`).join('\n'),
        'digest',
      );
    } catch (err) {
      console.error('[notification-service] Digest email failed:', err);
    }
    return { sent, digest };
  },

  /**
   * Extract @mentions from content and create mention notifications for
   * each found user. Parses @username or @useremail patterns.
   */
  async processMentions(
    workspaceId: string,
    organizationId: string | undefined,
    content: string,
    authorId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<ParsedNotification[]> {
    // Extract @-prefixed tokens (username or email).
    const mentionRegex = /@([A-Za-z0-9._%+-]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?)/g;
    const tokens = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      tokens.add(match[1]);
    }

    if (tokens.size === 0) return [];

    const results: ParsedNotification[] = [];
    for (const token of tokens) {
      // Look up user by email or name.
      const isEmail = token.includes('@');
      const user = await safePrisma(() =>
        isEmail
          ? prisma.user.findUnique({ where: { email: token }, select: { id: true } })
          : prisma.user.findFirst({ where: { name: token }, select: { id: true } }),
      null,
      );

      if (!user || user.id === authorId) continue;

      const notif = await NotificationService.create({
        userId: user.id,
        workspaceId,
        organizationId,
        type: 'mention',
        title: 'You were mentioned',
        body: `${authorId} mentioned you in a ${resourceType}.`,
        category: 'social',
        priority: 'high',
        actionUrl: `/${resourceType}/${resourceId}`,
        metadata: { resourceType, resourceId, authorId },
        createdBy: authorId,
      });
      if (notif) results.push(notif);
    }
    return results;
  },

  /**
   * Get a user's notification preferences (parsed from User.notificationPrefs).
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    return readPrefs(userId);
  },

  /**
   * Update a user's notification preferences (stored as JSON in
   * User.notificationPrefs).
   */
  async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await readPrefs(userId);
    const merged: NotificationPreferences = {
      emailEnabled: prefs.emailEnabled ?? current.emailEnabled,
      inAppEnabled: prefs.inAppEnabled ?? current.inAppEnabled,
      types: { ...current.types, ...(prefs.types || {}) },
      digestFrequency: prefs.digestFrequency ?? current.digestFrequency,
    };
    await safePrisma(() =>
      prisma.user.update({
        where: { id: userId },
        data: { notificationPrefs: JSON.stringify(merged) },
      }),
    null,
    );
    return merged;
  },

  /**
   * Get aggregate notification stats for a user.
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const rows = await safePrisma(() =>
      prisma.notification.findMany({
        where: { userId },
        select: { type: true, body: true, read: true },
        take: 500,
      }),
    [],
    );

    const stats: NotificationStats = {
      total: rows.length,
      unread: 0,
      byType: {},
      byCategory: {},
      byPriority: {},
    };

    for (const row of rows) {
      const env = parseEnvelope(row.body);
      if (env.archived) continue;
      if (!row.read) stats.unread += 1;
      stats.byType[row.type] = (stats.byType[row.type] || 0) + 1;
      stats.byCategory[env.category] = (stats.byCategory[env.category] || 0) + 1;
      stats.byPriority[env.priority] = (stats.byPriority[env.priority] || 0) + 1;
    }

    return stats;
  },
};
