import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { safeError } from '@/lib/security';
import {
  DEFAULT_SAFETY_CONFIG,
  validateSafetyConfig,
  getSafetyConfig,
  updateSafetyConfig,
  getAuditSummary,
  getAuditSummaryFromDB,
  getPendingApprovals,
  getPendingApprovalsFromDB,
  type SafetyConfig,
} from '@/lib/ads/google-safety';

export const maxDuration = 60;

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

  // Try D1 first, fall back to in-memory summary/pending counts.
  const summary = await getAuditSummaryFromDB().catch(() => getAuditSummary());
  const pending = await getPendingApprovalsFromDB()
    .then((list) => list.length)
    .catch(() => getPendingApprovals().length);

  return NextResponse.json({
    config: getSafetyConfig(),
    auditSummary: summary,
    pendingApprovals: pending,
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
      ...getSafetyConfig(),
      ...body,
    };

    const validation = validateSafetyConfig(candidate);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'invalid_safety_config', errors: validation.errors },
        { status: 400 },
      );
    }

    const updated = updateSafetyConfig(candidate);
    return NextResponse.json({ config: updated });
  } catch (e) {
    return NextResponse.json(safeError(e, 'ads/google-safety', 'config_update_failed'), {
      status: 500,
    });
  }
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
