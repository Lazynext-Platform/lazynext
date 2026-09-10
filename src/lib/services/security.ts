import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { encryptToken, decryptToken } from '@/lib/publishing/token-crypto';

// ── Types ──

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventInput {
  organizationId: string;
  workspaceId?: string | null;
  type: string;
  severity?: SecuritySeverity;
  description: string;
  actorId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SecurityEventRecord {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  type: string;
  severity: string;
  description: string;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  metadata: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface ListSecurityEventsOpts {
  severity?: SecuritySeverity;
  unresolved?: boolean;
  limit?: number;
}

export interface SecuritySummary {
  counts: Record<SecuritySeverity, number>;
  unresolvedCount: number;
  total: number;
  recent: SecurityEventRecord[];
}

export interface MigrateConnectionResult {
  migrated: boolean;
  platform: string;
}

export interface MigrateAllTokensResult {
  total: number;
  migrated: number;
  errors: string[];
}

const SEVERITIES: SecuritySeverity[] = ['critical', 'high', 'medium', 'low'];

function isEncrypted(token: string): boolean {
  return token.startsWith('v2:') || token.startsWith('plain:');
}

// ── Security Service ──

export const SecurityService = {
  /**
   * List security events for a workspace, optionally filtered by severity
   * or unresolved status.
   */
  async listSecurityEvents(workspaceId: string, opts?: ListSecurityEventsOpts): Promise<SecurityEventRecord[]> {
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.severity) {
      where.severity = opts.severity;
    }
    if (opts?.unresolved) {
      where.resolved = false;
    }
    return safePrisma(() =>
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts?.limit ?? 50,
      }) as Promise<SecurityEventRecord[]>,
    [] as SecurityEventRecord[]);
  },

  /**
   * Get a single security event by ID.
   */
  async getSecurityEvent(id: string): Promise<SecurityEventRecord | null> {
    return safePrisma(() =>
      prisma.securityEvent.findUnique({ where: { id } }) as Promise<SecurityEventRecord | null>,
    null);
  },

  /**
   * Create a new security event.
   */
  async createEvent(input: SecurityEventInput): Promise<SecurityEventRecord | null> {
    const severity = input.severity || 'medium';
    try {
      return await prisma.securityEvent.create({
        data: {
          organizationId: input.organizationId,
          workspaceId: input.workspaceId || null,
          type: input.type,
          severity,
          description: input.description,
          actorId: input.actorId || null,
          resourceType: input.resourceType || null,
          resourceId: input.resourceId || null,
          ipAddress: input.ipAddress || null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : '{}',
        },
      }) as SecurityEventRecord;
    } catch {
      return null;
    }
  },

  /**
   * Mark a security event as resolved.
   */
  async resolveEvent(id: string, resolvedBy: string): Promise<SecurityEventRecord | null> {
    try {
      return await prisma.securityEvent.update({
        where: { id },
        data: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
        },
      }) as SecurityEventRecord;
    } catch {
      return null;
    }
  },

  /**
   * Get a security summary for a workspace: counts by severity,
   * unresolved count, total, and recent events.
   */
  async getSecuritySummary(workspaceId: string): Promise<SecuritySummary> {
    const events = await safePrisma(() =>
      prisma.securityEvent.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }) as Promise<SecurityEventRecord[]>,
    [] as SecurityEventRecord[]);

    const counts: Record<SecuritySeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    let unresolvedCount = 0;
    for (const e of events) {
      const sev = (SEVERITIES.includes(e.severity as SecuritySeverity) ? e.severity : 'medium') as SecuritySeverity;
      counts[sev]++;
      if (!e.resolved) unresolvedCount++;
    }
    const recent = events.slice(0, 10);
    return {
      counts,
      unresolvedCount,
      total: events.length,
      recent,
    };
  },

  /**
   * Encrypt a token if it is currently plaintext (does not start with v2: or plain:).
   * Graceful degradation: if the encryption key is missing, return the original token
   * (for local dev without TOKEN_ENCRYPTION_KEY set).
   */
  async encryptTokenIfPlain(token: string): Promise<string> {
    if (isEncrypted(token)) return token;
    try {
      return await encryptToken(token);
    } catch {
      // Encryption key missing or crypto failure — return original for dev
      return token;
    }
  },

  /**
   * Decrypt a token if needed. Graceful fallback: returns the original
   * stored value if decryption fails (e.g. key missing in dev).
   */
  async decryptTokenIfNeeded(token: string): Promise<string> {
    if (!isEncrypted(token)) {
      // Plain token (no prefix) — return as-is for backward compat
      return token;
    }
    if (token.startsWith('plain:')) {
      return token.slice(6);
    }
    try {
      return await decryptToken(token);
    } catch {
      // Decryption failed — return original so callers don't crash
      return token;
    }
  },

  /**
   * Migrate a single PlatformConnection's token from plaintext to encrypted.
   * Returns { migrated, platform }.
   */
  async migrateConnectionToken(connectionId: string): Promise<MigrateConnectionResult> {
    const conn = await safePrisma(() =>
      prisma.platformConnection.findUnique({ where: { id: connectionId } }),
    null);

    if (!conn) {
      return { migrated: false, platform: 'unknown' };
    }

    if (isEncrypted(conn.accessToken)) {
      return { migrated: false, platform: conn.platform };
    }

    const encrypted = await this.encryptTokenIfPlain(conn.accessToken);
    if (encrypted === conn.accessToken) {
      // Encryption didn't change it (key missing) — nothing migrated
      return { migrated: false, platform: conn.platform };
    }

    try {
      await prisma.platformConnection.update({
        where: { id: connectionId },
        data: { accessToken: encrypted },
      });
      return { migrated: true, platform: conn.platform };
    } catch {
      return { migrated: false, platform: conn.platform };
    }
  },

  /**
   * Migrate all plaintext tokens for a user.
   * Returns { total, migrated, errors }.
   */
  async migrateAllTokens(userId: string): Promise<MigrateAllTokensResult> {
    const connections = await safePrisma(() =>
      prisma.platformConnection.findMany({
        where: { userId },
        select: { id: true, platform: true, accessToken: true },
      }),
    [] as Array<{ id: string; platform: string; accessToken: string }>);

    let migrated = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      if (isEncrypted(conn.accessToken)) continue;
      try {
        const encrypted = await this.encryptTokenIfPlain(conn.accessToken);
        if (encrypted === conn.accessToken) continue;
        await prisma.platformConnection.update({
          where: { id: conn.id },
          data: { accessToken: encrypted },
        });
        migrated++;
      } catch (e) {
        errors.push(`${conn.platform}: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    return { total: connections.length, migrated, errors };
  },
};
