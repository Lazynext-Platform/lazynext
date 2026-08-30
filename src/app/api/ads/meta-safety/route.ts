import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { safeError } from '@/lib/security';
import {
  DEFAULT_SAFETY_CONFIG,
  validateSafetyConfig,
  getAuditLog,
  getPendingApprovals,
  type SafetyConfig,
} from '@/lib/ads/meta-safety';

export const maxDuration = 60;

// In-memory current safety config. In a production system this would be
// persisted (e.g. in D1); for now it is held in-module so the API can read
// and update it within a single deployment.
let currentConfig: SafetyConfig = { ...DEFAULT_SAFETY_CONFIG };

/** Read the active safety config. */
function getSafetyConfig(): SafetyConfig {
  return { ...currentConfig };
}

async function isAdmin(uid: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user
    .findUnique({ where: { id: uid }, select: { email: true } })
    .catch(() => null);
  if (!user?.email) return false;
  return adminEmails.includes(user.email.toLowerCase());
}

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const audit = getAuditLog();
  const summary = {
    total: audit.length,
    successes: audit.filter((e) => e.result === 'success').length,
    failures: audit.filter((e) => e.result === 'failure').length,
    simulated: audit.filter((e) => e.result === 'simulated').length,
  };

  return NextResponse.json({
    config: getSafetyConfig(),
    auditSummary: summary,
    pendingApprovals: getPendingApprovals().length,
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<SafetyConfig>;
    const candidate: SafetyConfig = {
      ...DEFAULT_SAFETY_CONFIG,
      ...currentConfig,
      ...body,
    };

    const validation = validateSafetyConfig(candidate);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'invalid_safety_config', errors: validation.errors },
        { status: 400 },
      );
    }

    currentConfig = candidate;
    return NextResponse.json({ config: getSafetyConfig() });
  } catch (e) {
    return NextResponse.json(safeError(e, 'ads/meta-safety', 'config_update_failed'), {
      status: 500,
    });
  }
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
