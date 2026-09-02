import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_MUSIC_MOOD_MATCHER_CREDIT_COST,
  generateMusicRecommendations,
  validateAdMusicMoodMatcherInput,
  VALID_PLATFORMS,
  VALID_AD_MOODS,
  MAX_PRODUCT_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdMusicMoodMatcherInput,
} from '@/lib/creative/ad-music-mood-matcher';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-music-mood-matcher
 * Returns the credit cost, schema info, and supported platforms/moods (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-music-mood-matcher',
    creditCost: AD_MUSIC_MOOD_MATCHER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        adMood: 'string (optional: energetic, calm, inspirational, dramatic, playful, romantic, mysterious)',
        duration: `number (optional, ${MIN_DURATION}-${MAX_DURATION} seconds)`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        recommendations: 'MusicRecommendation[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      adMoods: VALID_AD_MOODS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const adMood =
    typeof body.adMood === 'string' && VALID_AD_MOODS.includes(body.adMood as never)
      ? body.adMood
      : undefined;

  const duration =
    typeof body.duration === 'number' && Number.isFinite(body.duration)
      ? Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(body.duration)))
      : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdMusicMoodMatcherInput = {
    productOrBrand,
    platform,
    adMood,
    duration,
    count,
    dryRun,
  };

  const validation = validateAdMusicMoodMatcherInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_MUSIC_MOOD_MATCHER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-music-mood-matcher');
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
    const result = await generateMusicRecommendations(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-music-mood-matcher').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-music-mood-matcher', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
