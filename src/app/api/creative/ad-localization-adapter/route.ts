import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_LOCALIZATION_ADAPTER_CREDIT_COST,
  generateLocalization,
  validateAdLocalizationAdapterInput,
  VALID_PLATFORMS,
  VALID_MARKETS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdLocalizationAdapterInput,
  type Market,
} from '@/lib/creative/ad-localization-adapter';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-localization-adapter
 * Returns the credit cost, schema info, and supported platforms/markets (no
 * auth required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'ad-localization-adapter',
    creditCost: AD_LOCALIZATION_ADAPTER_CREDIT_COST,
    schema: {
      input: {
        content: `string (required, max ${MAX_CONTENT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        sourceMarket: 'string (required: us, uk, eu, cn, jp, kr, in, br, sea, mena, latam)',
        targetMarket: 'string (required: us, uk, eu, cn, jp, kr, in, br, sea, mena, latam)',
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        localization: 'Localization',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      markets: VALID_MARKETS,
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

  const sourceMarket =
    typeof body.sourceMarket === 'string' && VALID_MARKETS.includes(body.sourceMarket as Market)
      ? (body.sourceMarket as Market)
      : '';

  const targetMarket =
    typeof body.targetMarket === 'string' && VALID_MARKETS.includes(body.targetMarket as Market)
      ? (body.targetMarket as Market)
      : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdLocalizationAdapterInput = {
    content,
    productOrBrand,
    sourceMarket: sourceMarket as Market,
    targetMarket: targetMarket as Market,
    platform,
    dryRun,
  };

  const validation = validateAdLocalizationAdapterInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = AD_LOCALIZATION_ADAPTER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:ad-localization-adapter');
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
    const result = await generateLocalization(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:ad-localization-adapter').catch(() => {});
    const safe = safeError(e, 'creative/ad-localization-adapter', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
