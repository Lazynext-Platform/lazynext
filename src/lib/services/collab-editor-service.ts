import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

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

/** Edit session content payload. */
interface EditSessionContent {
  resourceType: string;
  resourceId: string;
  activeUsers: string[];
  startedAt: string;
  endedAt?: string;
  active: boolean;
}

/** Edit snapshot content payload. */
interface EditSnapshotContent {
  content: string;
  savedBy: string;
  savedAt: string;
}

/** A structured edit session. */
export interface EditSession {
  id: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  organizationId: string;
  activeUsers: string[];
  startedAt: Date;
  endedAt?: Date;
  active: boolean;
  createdBy: string;
}

/** A content snapshot. */
export interface EditSnapshot {
  id: string;
  sessionId: string;
  content: string;
  savedBy: string;
  savedAt: Date;
}

export interface StartSessionInput {
  resourceType: string;
  resourceId: string;
  workspaceId?: string;
  userId: string;
}

// ── Helpers ──

function buildKey(resourceType: string, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function parseSessionContent(raw: string): EditSessionContent {
  const fallback: EditSessionContent = {
    resourceType: '',
    resourceId: '',
    activeUsers: [],
    startedAt: new Date().toISOString(),
    active: true,
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      resourceType: parsed.resourceType ?? '',
      resourceId: parsed.resourceId ?? '',
      activeUsers: Array.isArray(parsed.activeUsers) ? parsed.activeUsers : [],
      startedAt: parsed.startedAt ?? new Date().toISOString(),
      endedAt: parsed.endedAt,
      active: parsed.active ?? true,
    };
  } catch {
    return fallback;
  }
}

function parseSnapshotContent(raw: string): EditSnapshotContent {
  const fallback: EditSnapshotContent = {
    content: '',
    savedBy: '',
    savedAt: new Date().toISOString(),
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      content: parsed.content ?? '',
      savedBy: parsed.savedBy ?? '',
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}

function toSession(row: MemoryRow): EditSession {
  const content = parseSessionContent(row.content);
  const { resourceType, resourceId } = content.resourceType
    ? { resourceType: content.resourceType, resourceId: content.resourceId }
    : (() => {
        const key = row.sourceId || '';
        const idx = key.indexOf(':');
        return idx === -1
          ? { resourceType: key, resourceId: '' }
          : { resourceType: key.slice(0, idx), resourceId: key.slice(idx + 1) };
      })();

  return {
    id: row.id,
    resourceType,
    resourceId,
    workspaceId: row.workspaceId,
    organizationId: row.organizationId,
    activeUsers: content.activeUsers,
    startedAt: new Date(content.startedAt),
    endedAt: content.endedAt ? new Date(content.endedAt) : undefined,
    active: content.active,
    createdBy: row.createdBy,
  };
}

function toSnapshot(row: MemoryRow, sessionId: string): EditSnapshot {
  const content = parseSnapshotContent(row.content);
  return {
    id: row.id,
    sessionId,
    content: content.content,
    savedBy: content.savedBy,
    savedAt: new Date(content.savedAt),
  };
}

// ── Collab Editor Service ──

export const CollabEditorService = {
  /**
   * Start a collaborative editing session. Stored as a Memory with
   * type='edit_session'.
   */
  async startSession(organizationId: string, input: StartSessionInput): Promise<EditSession> {
    const key = buildKey(input.resourceType, input.resourceId);
    const content: EditSessionContent = {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      activeUsers: [input.userId],
      startedAt: new Date().toISOString(),
      active: true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'edit_session',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: key,
        confidence: 1.0,
        lifecycle: 'short',
        tags: JSON.stringify(['edit_session', input.resourceType]),
        createdBy: input.userId,
      },
    });

    return toSession(row as MemoryRow);
  },

  /**
   * Join an editing session. Adds the user to activeUsers if not already
   * present.
   */
  async joinSession(sessionId: string, userId: string): Promise<EditSession | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: sessionId } }),
    null,
    );
    if (!existing) return null;

    const content = parseSessionContent(existing.content);
    if (!content.activeUsers.includes(userId)) {
      content.activeUsers.push(userId);
    }

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: sessionId },
        data: { content: JSON.stringify(content).slice(0, 10000) },
      }),
    null,
    );
    if (!row) return null;
    return toSession(row as MemoryRow);
  },

  /**
   * Leave an editing session. Removes the user from activeUsers.
   */
  async leaveSession(sessionId: string, userId: string): Promise<EditSession | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: sessionId } }),
    null,
    );
    if (!existing) return null;

    const content = parseSessionContent(existing.content);
    content.activeUsers = content.activeUsers.filter((u) => u !== userId);

    // If no users remain, end the session automatically.
    if (content.activeUsers.length === 0) {
      content.active = false;
      content.endedAt = new Date().toISOString();
    }

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: sessionId },
        data: { content: JSON.stringify(content).slice(0, 10000) },
      }),
    null,
    );
    if (!row) return null;
    return toSession(row as MemoryRow);
  },

  /**
   * Get active edit sessions for a workspace.
   */
  async getActiveSessions(workspaceId: string): Promise<EditSession[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'edit_session', workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    [],
    );

    return rows
      .map((r) => toSession(r as MemoryRow))
      .filter((s) => s.active);
  },

  /**
   * Get users currently in an editing session.
   */
  async getSessionUsers(sessionId: string): Promise<string[]> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: sessionId } }),
    null,
    );
    if (!row) return [];
    const content = parseSessionContent(row.content);
    return content.activeUsers;
  },

  /**
   * Save a content snapshot for a session. Stored as a Memory with
   * type='edit_snapshot'.
   */
  async saveSnapshot(sessionId: string, content: string, userId: string): Promise<EditSnapshot | null> {
    const session = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: sessionId } }),
    null,
    );
    if (!session) return null;

    const snapshotContent: EditSnapshotContent = {
      content,
      savedBy: userId,
      savedAt: new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: (session as MemoryRow).workspaceId,
        organizationId: (session as MemoryRow).organizationId,
        type: 'edit_snapshot',
        content: JSON.stringify(snapshotContent).slice(0, 10000),
        source: 'user',
        sourceId: sessionId,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['edit_snapshot']),
        createdBy: userId,
      },
    });

    return toSnapshot(row as MemoryRow, sessionId);
  },

  /**
   * Get content snapshots for a session.
   */
  async getSnapshots(sessionId: string, limit: number = 20): Promise<EditSnapshot[]> {
    const take = Math.min(Math.max(limit, 1), 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'edit_snapshot', sourceId: sessionId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    [],
    );

    return rows.map((r) => toSnapshot(r as MemoryRow, sessionId));
  },

  /**
   * End an editing session. Marks it as inactive and sets endedAt.
   */
  async endSession(sessionId: string): Promise<EditSession | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: sessionId } }),
    null,
    );
    if (!existing) return null;

    const content = parseSessionContent(existing.content);
    content.active = false;
    content.endedAt = new Date().toISOString();
    content.activeUsers = [];

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: sessionId },
        data: { content: JSON.stringify(content).slice(0, 10000) },
      }),
    null,
    );
    if (!row) return null;
    return toSession(row as MemoryRow);
  },
};
