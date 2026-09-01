import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST,
  generateSoundDesign,
  validateAdCreativeSoundDesignStrategistInput,
  VALID_PLATFORMS,
  VALID_MOODS,
  VALID_LAYER_TYPES,
  VALID_EMOTIONAL_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_MOOD_LENGTH,
  type AdCreativeSoundDesignStrategistInput,
} from '@/lib/creative/ad-creative-sound-design-strategist';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-creative-sound-design-strategist
 * Returns the credit cost, schema info, and supported platforms/moods/layer
 * types/emotional impacts (no auth required for catalog metadata — same
 * pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-creative-sound-design-strategist',
    creditCost: AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        mood: `string (required, max ${MAX_MOOD_LENGTH} chars)`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        strategy: 'SoundDesignStrategy',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      moods: VALID_MOODS,
      layerTypes: VALID_LAYER_TYPES,
      emotionalImpacts: VALID_EMOTIONAL_IMPACTS,
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

  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, MAX_CONTENT_LENGTH) : '';

  const mood =
    typeof body.mood === 'string' ? body.mood.trim().slice(0, MAX_MOOD_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdCreativeSoundDesignStrategistInput = {
    productOrBrand,
    content,
    mood,
    platform,
    dryRun,
  };

  const validation = validateAdCreativeSoundDesignStrategistInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-creative-sound-design-strategist');
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
    const result = await generateSoundDesign(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-creative-sound-design-strategist').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-creative-sound-design-strategist', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
