import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_FONT_PAIRING_GENERATOR_CREDIT_COST,
  generateFontPairings,
  validateAdFontPairingGeneratorInput,
  VALID_PLATFORMS,
  VALID_MOODS,
  MAX_PRODUCT_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdFontPairingGeneratorInput,
} from '@/lib/creative/ad-font-pairing-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-font-pairing-generator
 * Returns the credit cost, schema info, and supported platforms/moods (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-font-pairing-generator',
    creditCost: AD_FONT_PAIRING_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        mood: 'string (optional: modern, classic, playful, luxury, bold, minimal)',
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        pairings: 'FontPairing[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      moods: VALID_MOODS,
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

  const mood =
    typeof body.mood === 'string' && VALID_MOODS.includes(body.mood as never)
      ? (body.mood as 'modern' | 'classic' | 'playful' | 'luxury' | 'bold' | 'minimal')
      : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdFontPairingGeneratorInput = {
    productOrBrand,
    platform,
    mood,
    count,
    dryRun,
  };

  const validation = validateAdFontPairingGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_FONT_PAIRING_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-font-pairing-generator');
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
    const result = await generateFontPairings(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-font-pairing-generator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/ad-font-pairing-generator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
