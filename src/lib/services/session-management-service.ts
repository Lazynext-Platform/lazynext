/**
 * Session Management Service.
 *
 * Uses the existing Session model and Event table to track user sessions,
 * login history, and detect suspicious activity.
 *
 * Event records for login:
 *   - type: 'login'
 *   - actor: userId
 *   - actorType: 'user'
 *   - metadata: JSON.stringify({ ipAddress, userAgent, method, success, twoFactorUsed })
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface SessionRecord {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
  revokedAt: string | null;
  createdAt?: string;
}

export interface LoginRecordInput {
  ipAddress: string;
  userAgent: string;
  method: string;
  success: boolean;
  twoFactorUsed?: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  success: boolean;
  twoFactorUsed: boolean;
  timestamp: string;
}

export interface ActiveDevice {
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActivity: string;
  sessionId: string;
}

export interface SuspiciousActivityResult {
  suspicious: boolean;
  reasons: string[];
}

export interface SessionStats {
  activeCount: number;
  deviceCount: number;
  locationCount: number;
  failedLogins: number;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}

// ── Session Management Service ──

export const SessionManagementService = {
  /**
   * List active (non-expired, non-revoked) sessions for a user.
   */
  async listSessions(userId: string): Promise<SessionRecord[]> {
    const sessions = await safePrisma(
      () =>
        prisma.session.findMany({
          where: {
            userId,
            revokedAt: null,
            expires: { gt: new Date() },
          },
          orderBy: { expires: 'desc' },
        }),
      [],
    );
    return sessions.map((s) => ({
      id: s.id,
      sessionToken: s.sessionToken,
      userId: s.userId,
      expires: s.expires.toISOString(),
      revokedAt: s.revokedAt?.toISOString() || null,
    }));
  },

  /**
   * Revoke (delete) a single session.
   */
  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    await safePrisma(
      () => prisma.session.delete({ where: { id: sessionId } }),
      null,
    );
    return { revoked: true };
  },

  /**
   * Revoke all sessions for a user, optionally except the current one.
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<{ revoked: number }> {
    const where: Record<string, unknown> = { userId };
    if (exceptSessionId) {
      where.NOT = { id: exceptSessionId };
    }
    const result = await safePrisma(
      () => prisma.session.deleteMany({ where }),
      { count: 0 },
    );
    return { revoked: result.count };
  },

  /**
   * Get activity events for a specific session.
   */
  async getSessionActivity(sessionId: string): Promise<unknown[]> {
    const events = await safePrisma(
      () =>
        prisma.event.findMany({
          where: {
            type: 'login',
            metadata: { contains: sessionId },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      [],
    );
    return events;
  },

  /**
   * Record a login event.
   */
  async recordLogin(userId: string, input: LoginRecordInput): Promise<{ recorded: boolean }> {
    await prisma.event.create({
      data: {
        type: 'login',
        actor: userId,
        actorType: 'user',
        resourceType: 'session',
        metadata: JSON.stringify({
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          method: input.method,
          success: input.success,
          twoFactorUsed: input.twoFactorUsed || false,
        }),
        source: 'system',
      },
    });
    return { recorded: true };
  },

  /**
   * Get login history for a user from the Event table.
   */
  async getLoginHistory(userId: string, opts?: ListOptions): Promise<LoginHistoryEntry[]> {
    const take = opts?.limit ?? 50;
    const skip = opts?.offset ?? 0;

    const events = await safePrisma(
      () =>
        prisma.event.findMany({
          where: { type: 'login', actor: userId },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      [],
    );

    return events.map((e) => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(e.metadata) as Record<string, unknown>;
      } catch {
        // keep empty
      }
      return {
        id: e.id,
        ipAddress: (data.ipAddress as string) || 'unknown',
        userAgent: (data.userAgent as string) || 'unknown',
        method: (data.method as string) || 'password',
        success: data.success !== false,
        twoFactorUsed: data.twoFactorUsed === true,
        timestamp: e.createdAt.toISOString(),
      };
    });
  },

  /**
   * Get active devices from sessions (parse userAgent).
   */
  async getActiveDevices(userId: string): Promise<ActiveDevice[]> {
    const sessions = await this.listSessions(userId);
    const events = await this.getLoginHistory(userId, { limit: 100 });

    // Build a map of session token -> last known IP/UA from login events
    const deviceMap = new Map<string, ActiveDevice>();

    for (const session of sessions) {
      // Find the most recent login event matching this session
      const recentEvent = events.find((e) => e.userAgent);
      const ua = recentEvent?.userAgent || 'unknown';
      const parsed = parseUserAgent(ua);
      const ip = recentEvent?.ipAddress || 'unknown';

      deviceMap.set(session.id, {
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        ipAddress: ip,
        lastActivity: session.expires,
        sessionId: session.id,
      });
    }

    return Array.from(deviceMap.values());
  },

  /**
   * Detect suspicious activity patterns.
   */
  async detectSuspiciousActivity(userId: string): Promise<SuspiciousActivityResult> {
    const reasons: string[] = [];

    // Get recent login events (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await safePrisma(
      () =>
        prisma.event.findMany({
          where: {
            type: 'login',
            actor: userId,
            createdAt: { gte: oneHourAgo },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      [],
    );

    // Parse events
    const parsed = recentEvents.map((e) => {
      try {
        return JSON.parse(e.metadata) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    });

    // Check: multiple failed logins (3+ in 1h)
    const failedCount = parsed.filter((p) => p.success === false).length;
    if (failedCount >= 3) {
      reasons.push(`Multiple failed login attempts (${failedCount} in the last hour)`);
    }

    // Check: new IP addresses
    const knownIps = new Set<string>();
    const allEvents = await safePrisma(
      () =>
        prisma.event.findMany({
          where: { type: 'login', actor: userId },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      [],
    );

    const allParsed = allEvents.map((e) => {
      try {
        return JSON.parse(e.metadata) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    });

    // First 50 events are "known" IPs, check if recent ones have new IPs
    const knownSet = new Set<string>();
    for (let i = 50; i < allParsed.length; i++) {
      const ip = allParsed[i].ipAddress as string;
      if (ip) knownSet.add(ip);
    }
    for (let i = 0; i < Math.min(50, allParsed.length); i++) {
      const ip = allParsed[i].ipAddress as string;
      if (ip && knownSet.size > 0 && !knownSet.has(ip)) {
        reasons.push(`Login from new IP address: ${ip}`);
        break;
      }
      if (ip) knownIps.add(ip);
    }

    // Check: concurrent sessions from different IPs
    const recentIps = new Set<string>();
    for (const p of parsed.slice(0, 10)) {
      const ip = p.ipAddress as string;
      if (ip && p.success !== false) recentIps.add(ip);
    }
    if (recentIps.size > 2) {
      reasons.push(`Concurrent sessions from ${recentIps.size} different IP addresses`);
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  },

  /**
   * Get security-related events for a user.
   */
  async getSecurityEvents(userId: string, opts?: ListOptions): Promise<unknown[]> {
    const take = opts?.limit ?? 50;
    const skip = opts?.offset ?? 0;

    const events = await safePrisma(
      () =>
        prisma.event.findMany({
          where: {
            actor: userId,
            type: { in: ['login', 'logout', 'password_change', '2fa_enabled', '2fa_disabled', 'session_revoked'] },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
      [],
    );

    return events.map((e) => ({
      id: e.id,
      type: e.type,
      timestamp: e.createdAt.toISOString(),
      metadata: (() => {
        try {
          return JSON.parse(e.metadata);
        } catch {
          return {};
        }
      })(),
    }));
  },

  /**
   * Get session statistics for a user.
   */
  async getStats(userId: string): Promise<SessionStats> {
    const sessions = await this.listSessions(userId);
    const devices = await this.getActiveDevices(userId);

    // Count unique IPs as "locations"
    const ips = new Set(devices.map((d) => d.ipAddress));

    // Count failed logins in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = await safePrisma(
      () =>
        prisma.event.findMany({
          where: {
            type: 'login',
            actor: userId,
            createdAt: { gte: oneDayAgo },
          },
        }),
      [],
    );

    let failedLogins = 0;
    for (const e of recentEvents) {
      try {
        const data = JSON.parse(e.metadata) as Record<string, unknown>;
        if (data.success === false) failedLogins++;
      } catch {
        // ignore
      }
    }

    return {
      activeCount: sessions.length,
      deviceCount: devices.length,
      locationCount: ips.size,
      failedLogins,
    };
  },
};

// ── Internal helpers ──

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Browser detection
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios|crmos/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  // OS detection
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macos|iphone|ipad/i.test(ua)) os = 'macOS/iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Device type
  if (/mobile|iphone|android.*mobile/i.test(ua)) device = 'Mobile';
  else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

  return { device, browser, os };
}
