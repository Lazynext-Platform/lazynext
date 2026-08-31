import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_COLOR_PALETTE_GENERATOR_CREDIT_COST,
  generateColorPalettes,
  validateAdColorPaletteGeneratorInput,
  VALID_PLATFORMS,
  VALID_EMOTIONS,
  MAX_PRODUCT_LENGTH,
  MAX_BRAND_COLOR_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdColorPaletteGeneratorInput,
} from '@/lib/creative/ad-color-palette-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-color-palette-generator
 * Returns the credit cost, schema info, and supported platforms/emotions (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-color-palette-generator',
    creditCost: AD_COLOR_PALETTE_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        emotion: 'string (optional: energetic, calm, luxury, trust, playful, urgent)',
        brandColor: `string (optional, hex, max ${MAX_BRAND_COLOR_LENGTH} chars)`,
        count: `number (optional, ${MIN_COUNT}-${MAX_COUNT}, default ${DEFAULT_COUNT})`,
        dryRun: 'boolean (optional)',
      },
      output: {
        palettes: 'ColorPalette[]',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      emotions: VALID_EMOTIONS,
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

  const emotion =
    typeof body.emotion === 'string' && VALID_EMOTIONS.includes(body.emotion as never)
      ? (body.emotion as 'energetic' | 'calm' | 'luxury' | 'trust' | 'playful' | 'urgent')
      : undefined;

  const brandColor =
    typeof body.brandColor === 'string' ? body.brandColor.trim().slice(0, MAX_BRAND_COLOR_LENGTH) : undefined;

  const count =
    typeof body.count === 'number' && Number.isFinite(body.count)
      ? Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(body.count)))
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdColorPaletteGeneratorInput = {
    productOrBrand,
    platform,
    emotion,
    brandColor,
    count,
    dryRun,
  };

  const validation = validateAdColorPaletteGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_COLOR_PALETTE_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-color-palette-generator');
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
    const result = await generateColorPalettes(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-color-palette-generator').catch(() => {});
    const safe = safeError(e, 'creative/ad-color-palette-generator', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
