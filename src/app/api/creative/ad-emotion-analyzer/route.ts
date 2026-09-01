import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_EMOTION_ANALYZER_CREDIT_COST,
  analyzeEmotions,
  validateAdEmotionAnalyzerInput,
  VALID_PLATFORMS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdEmotionAnalyzerInput,
} from '@/lib/creative/ad-emotion-analyzer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-emotion-analyzer
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-emotion-analyzer',
    creditCost: AD_EMOTION_ANALYZER_CREDIT_COST,
    schema: {
      input: {
        adContent: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: `string (optional: ${VALID_PLATFORMS.join(', ')})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        analysis: 'EmotionAnalysis',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const adContent =
    typeof body.adContent === 'string' ? body.adContent.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdEmotionAnalyzerInput = {
    adContent,
    productOrBrand,
    platform,
    dryRun,
  };

  const validation = validateAdEmotionAnalyzerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_EMOTION_ANALYZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-emotion-analyzer');
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
    const result = await analyzeEmotions(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-emotion-analyzer').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-emotion-analyzer', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
