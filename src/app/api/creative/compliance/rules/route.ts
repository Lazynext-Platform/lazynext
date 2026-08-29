import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import {
  getComplianceRules,
  getCompliancePlatforms,
  dbRuleToComplianceRule,
  type CompliancePlatform,
  type ComplianceCategory,
  type ComplianceSeverity,
} from '@/lib/creative/compliance';

const VALID_PLATFORMS = new Set<string>(['tiktok', 'youtube', 'meta', 'google', 'universal']);
const VALID_CATEGORIES = new Set<string>([
  'prohibited_content', 'restricted_content', 'claim_verification',
  'brand_safety', 'platform_policy', 'disclosure', 'copyright',
  'accessibility', 'data_privacy',
]);
const VALID_SEVERITIES = new Set<string>(['critical', 'high', 'medium', 'low', 'info']);

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const platformParam = url.searchParams.get('platform');
  const platform = platformParam && VALID_PLATFORMS.has(platformParam)
    ? platformParam
    : undefined;

  // Built-in rules
  const builtinRules = getComplianceRules(platform as CompliancePlatform);
  const platforms = getCompliancePlatforms();

  // Custom rules for this user
  let customRules: ReturnType<typeof dbRuleToComplianceRule>[] = [];
  try {
    const dbRules = await prisma.customComplianceRule.findMany({
      where: { userId: uid, ...(platform ? { platform } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    customRules = dbRules.map(dbRuleToComplianceRule);
  } catch (e) {
    console.warn('[compliance/rules] failed to load custom rules:', String(e));
  }

  return NextResponse.json({ rules: builtinRules, customRules, platforms });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform || '');
  const category = String(body.category || '');
  const severity = String(body.severity || 'medium');
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const recommendation = String(body.recommendation || '').trim();
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === 'string') : [];
  const priority = typeof body.priority === 'number' ? Math.max(0, Math.min(100, body.priority)) : 0;

  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }
  if (!VALID_SEVERITIES.has(severity)) {
    return NextResponse.json({ error: 'invalid_severity' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: 'description_required' }, { status: 400 });
  }

  try {
    const rule = await prisma.customComplianceRule.create({
      data: {
        userId: uid,
        platform,
        category,
        severity,
        title,
        description,
        recommendation,
        keywordsJson: JSON.stringify(keywords),
        priority,
        enabled: true,
      },
    });
    return NextResponse.json({ rule: dbRuleToComplianceRule(rule) });
  } catch (e) {
    console.error('[compliance/rules] create error:', String(e));
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}

async function __byokPUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  // Verify ownership
  const existing = await prisma.customComplianceRule.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof body.platform === 'string' && VALID_PLATFORMS.has(body.platform)) updates.platform = body.platform;
  if (typeof body.category === 'string' && VALID_CATEGORIES.has(body.category)) updates.category = body.category;
  if (typeof body.severity === 'string' && VALID_SEVERITIES.has(body.severity)) updates.severity = body.severity;
  if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
  if (typeof body.description === 'string' && body.description.trim()) updates.description = body.description.trim();
  if (typeof body.recommendation === 'string') updates.recommendation = body.recommendation.trim();
  if (Array.isArray(body.keywords)) updates.keywordsJson = JSON.stringify(body.keywords.filter((k: unknown) => typeof k === 'string'));
  if (typeof body.priority === 'number') updates.priority = Math.max(0, Math.min(100, body.priority));
  if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 });
  }

  try {
    const updated = await prisma.customComplianceRule.update({ where: { id }, data: updates });
    return NextResponse.json({ rule: dbRuleToComplianceRule(updated) });
  } catch (e) {
    console.error('[compliance/rules] update error:', String(e));
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

async function __byokDELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  // Verify ownership
  const existing = await prisma.customComplianceRule.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    await prisma.customComplianceRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[compliance/rules] delete error:', String(e));
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
export const PUT = withAtlas(__byokPUT);
export const DELETE = withAtlas(__byokDELETE);
