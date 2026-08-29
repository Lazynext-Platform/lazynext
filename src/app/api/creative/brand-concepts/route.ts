import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateBrandConcepts,
  validateBrandConceptsRequest,
  BRAND_CONCEPTS_COST,
} from '@/lib/creative/brand-concepts';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.slice(0, 10000) : '';
  const sourceType = typeof body.sourceType === 'string' ? body.sourceType.slice(0, 50) : 'description';
  const productName = typeof body.productName === 'string' ? body.productName.slice(0, 200) : undefined;
  const targetPlatform = typeof body.targetPlatform === 'string' ? body.targetPlatform.slice(0, 50) : undefined;
  const conceptCount = typeof body.conceptCount === 'number' ? Math.max(2, Math.min(5, Math.round(body.conceptCount))) : undefined;

  const validation = validateBrandConceptsRequest({ sourceContent, sourceType, conceptCount });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, BRAND_CONCEPTS_COST, 'creative:brand-concepts');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateBrandConcepts({
      sourceType: sourceType as 'url' | 'description',
      sourceContent,
      productName,
      targetPlatform,
      conceptCount,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, BRAND_CONCEPTS_COST, 'creative:brand-concepts');
    console.error('[creative/brand-concepts] error:', String(e));
    return NextResponse.json({ error: 'generation_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
