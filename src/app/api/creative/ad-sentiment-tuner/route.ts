import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_SENTIMENT_TUNER_CREDIT_COST,
  tuneSentiment,
  validateAdSentimentTunerInput,
  VALID_PLATFORMS,
  VALID_SENTIMENTS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdSentimentTunerInput,
} from '@/lib/creative/ad-sentiment-tuner';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-sentiment-tuner
 * Returns the credit cost, schema info, and supported platforms/sentiments
 * (no auth required for catalog metadata — same pattern as other creative
 * catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-sentiment-tuner',
    creditCost: AD_SENTIMENT_TUNER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        targetSentiment: 'string (required: positive, neutral, urgent, playful, authoritative, empathetic)',
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        tuning: 'SentimentTuning',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      sentiments: VALID_SENTIMENTS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const targetSentiment =
    typeof body.targetSentiment === 'string' && VALID_SENTIMENTS.includes(body.targetSentiment)
      ? body.targetSentiment
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdSentimentTunerInput = {
    content,
    productOrBrand,
    targetSentiment: targetSentiment as AdSentimentTunerInput['targetSentiment'],
    platform,
    dryRun,
  };

  const validation = validateAdSentimentTunerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_SENTIMENT_TUNER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-sentiment-tuner');
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
    const result = await tuneSentiment(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-sentiment-tuner').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-sentiment-tuner', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
