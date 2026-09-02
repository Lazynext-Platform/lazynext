import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  predictPerformance,
  validateAdPerformancePredictorInput,
  AD_PERFORMANCE_PREDICTOR_CREDIT_COST,
  type AdPerformancePredictorInput,
} from '@/lib/creative/ad-performance-predictor';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-performance-predictor
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: AD_PERFORMANCE_PREDICTOR_CREDIT_COST,
    schema: {
      input: {
        briefOrConcept: 'string (required, max 5000 chars)',
        platform: 'string (required: tiktok|instagram|youtube|facebook|x|linkedin|snapchat|pinterest|google|reddit)',
        targetAudience: 'string (optional, max 1000 chars)',
        productCategory: 'string (optional, max 200 chars)',
        dryRun: 'boolean (optional)',
      },
      output: {
        prediction: {
          overallScore: 'number (0-100)',
          grade: 'string (F-A+)',
          predictedCTR: 'string',
          predictedEngagement: 'string',
          conversionLikelihood: 'string',
          viralityScore: 'number (0-100)',
          metrics: 'PerformanceMetric[]',
          factors: 'PerformanceFactor[]',
          strengths: 'string[]',
          risks: 'string[]',
          recommendations: 'string[]',
          bestPostingTime: 'string',
          estimatedReach: 'string',
        },
        dryRun: 'boolean',
      },
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const briefOrConcept =
    typeof body.briefOrConcept === 'string' ? body.briefOrConcept.trim().slice(0, 5000) : '';
  if (!briefOrConcept) {
    return NextResponse.json({ error: 'brief_or_concept_required' }, { status: 400 });
  }

  const platform =
    typeof body.platform === 'string' ? body.platform.trim() : '';
  if (!platform) {
    return NextResponse.json({ error: 'platform_required' }, { status: 400 });
  }

  const targetAudience =
    typeof body.targetAudience === 'string' && body.targetAudience.trim()
      ? body.targetAudience.trim().slice(0, 1000)
      : undefined;

  const productCategory =
    typeof body.productCategory === 'string' && body.productCategory.trim()
      ? body.productCategory.trim().slice(0, 200)
      : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdPerformancePredictorInput = {
    briefOrConcept,
    platform,
    targetAudience,
    productCategory,
    dryRun,
  };

  const validation = validateAdPerformancePredictorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, AD_PERFORMANCE_PREDICTOR_CREDIT_COST, 'creative:ad-performance-predictor');
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
    const result = await predictPerformance(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, AD_PERFORMANCE_PREDICTOR_CREDIT_COST, 'creative:ad-performance-predictor');
    const { error, status } = safeAtlasError(e, 'creative/ad-performance-predictor', 'ad_performance_predictor_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
