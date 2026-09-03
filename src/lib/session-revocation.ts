/**
 * Server-side session revocation utilities.
 *
 * With JWT strategy, sessions are stateless — the JWT is valid until expiry.
 * To support revocation (logout-all, admin force-logout, compromised session),
 * we store a `sessionTokenHash` in the JWT and check it against the Session
 * table on each request. If the session row is revoked (revokedAt set) or
 * missing, the JWT is treated as invalid.
 *
 * For performance, the check is cached with a short TTL (60s) to avoid a DB
 * lookup on every auth() call. Sensitive operations (password change, billing,
 * admin actions) should bypass the cache via `isSessionRevokedUncached()`.
 */

import { prisma } from '@/lib/prisma';

// Cache: sessionTokenHash → { revoked: boolean, checkedAt: number }
const sessionCache = new Map<string, { revoked: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Hash a session token for DB lookup (never store the raw token).
 * Exported for testing to verify hash consistency with auth.ts.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if a session has been revoked (with caching).
 * Returns true if the session is revoked or not found in the DB.
 */
export async function isSessionRevoked(sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false; // JWT-only sessions (no adapter) skip this check
  const hash = await hashToken(sessionToken);
  const cached = sessionCache.get(hash);
  const now = Date.now();

  if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached.revoked;
  }

  return isSessionRevokedUncached(sessionToken);
}

/**
 * Check if a session has been revoked (no caching — always hits DB).
 * Use this for sensitive operations.
 */
export async function isSessionRevokedUncached(sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    const hash = await hashToken(sessionToken);
    const session = await prisma.session.findUnique({
      where: { sessionToken: hash },
      select: { revokedAt: true, expires: true },
    });

    const revoked = !session || session.revokedAt !== null || session.expires < new Date();
    sessionCache.set(hash, { revoked, checkedAt: Date.now() });
    return revoked;
  } catch {
    // DB error — don't block the request, let the JWT proceed
    return false;
  }
}

/**
 * Revoke all sessions for a user (logout-all).
 * Sets revokedAt on all active session rows.
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  // Clear cache for all entries (conservative — can't selectively clear)
  sessionCache.clear();
  return result.count;
}

/**
 * Revoke a single session by token.
 */
export async function revokeSession(sessionToken: string): Promise<void> {
  const hash = await hashToken(sessionToken);
  await prisma.session.update({
    where: { sessionToken: hash },
    data: { revokedAt: new Date() },
  });
  sessionCache.delete(hash);
}

/**
 * Clean up expired session cache entries periodically.
 */
if (sessionCache.size > 500) {
  const now = Date.now();
  for (const [key, entry] of sessionCache) {
    if (now - entry.checkedAt > CACHE_TTL_MS * 5) {
      sessionCache.delete(key);
    }
  }
}
