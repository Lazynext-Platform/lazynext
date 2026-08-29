import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  checkCompliance,
  validateComplianceRequest,
  COMPLIANCE_COST,
  type ComplianceCheckRequest,
  type CompliancePlatform,
} from '@/lib/creative/compliance';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

const VALID_PLATFORMS = new Set<CompliancePlatform>(['tiktok', 'youtube', 'meta', 'google', 'universal']);

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content : '';
  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p: unknown) => typeof p === 'string' && VALID_PLATFORMS.has(p as CompliancePlatform)) as CompliancePlatform[]
    : [];

  const request: ComplianceCheckRequest = {
    content,
    platforms,
    contentType: body.contentType,
    brandName: typeof body.brandName === 'string' ? body.brandName : undefined,
    productClaims: Array.isArray(body.productClaims)
      ? body.productClaims.filter((c: unknown) => typeof c === 'string') as string[]
      : undefined,
    targetAudience: typeof body.targetAudience === 'string' ? body.targetAudience : undefined,
  };

  const { valid, errors } = validateComplianceRequest(request);
  if (!valid) {
    return NextResponse.json({ error: 'invalid_request', detail: errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, COMPLIANCE_COST, 'creative:compliance');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await checkCompliance(request, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, COMPLIANCE_COST, 'creative:compliance');
    console.error('[creative/compliance] error:', String(e));
    return NextResponse.json({ error: 'compliance_check_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
