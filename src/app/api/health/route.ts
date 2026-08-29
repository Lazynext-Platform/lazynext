import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTokenEncryptionConfigured } from '@/lib/publishing/token-crypto';

/**
 * GET /api/health
 * Lightweight health check endpoint for monitoring and deployment verification.
 * Returns the status of critical services and configuration.
 *
 * This endpoint is unauthenticated (public) so it can be used by:
 *   - Cloudflare Workers health checks
 *   - Uptime monitoring (e.g. UptimeRobot)
 *   - Deployment verification scripts
 *
 * No sensitive information is exposed — only boolean flags for config presence.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  let allOk = true;

  // Check 1: D1 database connectivity (lightweight query)
  try {
    await prisma.user.count();
    checks.database = { ok: true };
  } catch (e) {
    checks.database = { ok: false, detail: 'query_failed' };
    allOk = false;
  }

  // Check 2: Token encryption key configured
  const tokenEncryptionOk = isTokenEncryptionConfigured();
  checks.tokenEncryption = { ok: tokenEncryptionOk };
  if (!tokenEncryptionOk) allOk = false;

  // Check 3: Cron secret configured
  const cronSecretOk = !!process.env.CRON_SECRET;
  checks.cronSecret = { ok: cronSecretOk };
  if (!cronSecretOk) allOk = false;

  // Check 4: Auth secret configured
  const authSecretOk = !!process.env.AUTH_SECRET || !!process.env.NEXTAUTH_SECRET;
  checks.authSecret = { ok: authSecretOk };
  if (!authSecretOk) allOk = false;

  // Check 5: Platform OAuth credentials (informational, not blocking)
  const platformCreds = {
    tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    youtube: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
    meta: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
  };
  checks.platformOAuth = { ok: true, detail: JSON.stringify(platformCreds) };

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
