import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  scoreCreativeQuality,
  validateQualityScoringRequest,
  QUALITY_SCORING_COST,
  type BenchmarkType,
} from '@/lib/creative/quality-scoring';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_BENCHMARK_TYPES: BenchmarkType[] = ['industry_avg', 'top_quartile', 'user_history'];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Normalize and bound inputs
  const creativeContent =
    typeof body.creativeContent === 'string' ? body.creativeContent.slice(0, 5000) : '';
  const creativeType =
    typeof body.creativeType === 'string' ? body.creativeType.slice(0, 100) : undefined;
  const platform =
    typeof body.platform === 'string' ? body.platform.slice(0, 50) : undefined;
  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.slice(0, 200) : undefined;
  const brandContext =
    typeof body.brandContext === 'string' ? body.brandContext.slice(0, 2000) : undefined;

  let benchmarkType: BenchmarkType | undefined;
  if (typeof body.benchmarkType === 'string') {
    benchmarkType = VALID_BENCHMARK_TYPES.includes(body.benchmarkType as BenchmarkType)
      ? (body.benchmarkType as BenchmarkType)
      : undefined;
  }

  const validation = validateQualityScoringRequest({
    creativeContent,
    creativeType,
    platform,
    targetAudience,
    brandContext,
    benchmarkType,
  });
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join('; ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, QUALITY_SCORING_COST, 'creative:quality-scoring');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await scoreCreativeQuality({
      creativeContent,
      creativeType,
      platform,
      targetAudience,
      brandContext,
      benchmarkType,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, QUALITY_SCORING_COST, 'creative:quality-scoring');
    console.error('[creative/quality-scoring] error:', String(e));
    return NextResponse.json({ error: 'scoring_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
