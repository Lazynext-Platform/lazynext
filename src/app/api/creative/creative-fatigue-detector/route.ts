import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_FATIGUE_DETECTOR_CREDIT_COST,
  detectFatigue,
  validateCreativeFatigueDetectorInput,
  VALID_PLATFORMS,
  VALID_FATIGUE_LEVELS,
  VALID_RECOMMENDATIONS,
  VALID_URGENCIES,
  MAX_DESCRIPTION_LENGTH,
  type CreativeFatigueDetectorInput,
} from '@/lib/creative/creative-fatigue-detector';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-fatigue-detector
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-fatigue-detector',
    creditCost: CREATIVE_FATIGUE_DETECTOR_CREDIT_COST,
    schema: {
      input: {
        creativeDescription: `string (required, max ${MAX_DESCRIPTION_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        daysRunning: 'number (required, > 0)',
        currentCTR: 'number (required, 0-100)',
        previousCTR: 'number (optional, 0-100)',
        impressions: 'number (required, > 0)',
        dryRun: 'boolean (optional)',
      },
      output: {
        fatigueScore: 'number (0-100)',
        fatigueLevel: 'FatigueLevel',
        recommendation: 'FatigueRecommendation',
        factors: 'FatigueFactor[]',
        suggestedActions: 'string[]',
        estimatedRefreshUrgency: 'RefreshUrgency',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      fatigueLevels: VALID_FATIGUE_LEVELS,
      recommendations: VALID_RECOMMENDATIONS,
      urgencies: VALID_URGENCIES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const creativeDescription =
    typeof body.creativeDescription === 'string' ? body.creativeDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const daysRunning =
    typeof body.daysRunning === 'number' && Number.isFinite(body.daysRunning) ? body.daysRunning : NaN;

  const currentCTR =
    typeof body.currentCTR === 'number' && Number.isFinite(body.currentCTR) ? body.currentCTR : NaN;

  const previousCTR =
    typeof body.previousCTR === 'number' && Number.isFinite(body.previousCTR) ? body.previousCTR : undefined;

  const impressions =
    typeof body.impressions === 'number' && Number.isFinite(body.impressions) ? body.impressions : NaN;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeFatigueDetectorInput = {
    creativeDescription,
    platform,
    daysRunning,
    currentCTR,
    previousCTR,
    impressions,
    dryRun,
  };

  const validation = validateCreativeFatigueDetectorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_FATIGUE_DETECTOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-fatigue-detector');
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
    const result = await detectFatigue(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-fatigue-detector').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-fatigue-detector', 'detect_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
