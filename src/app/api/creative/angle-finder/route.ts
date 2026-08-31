import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  ANGLE_FINDER_CREDIT_COST,
  findAngles,
  validateAngleFinderInput,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AngleFinderInput,
} from '@/lib/creative/angle-finder';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/angle-finder
 * Returns the credit cost, schema info, and supported platforms (no auth
 * required for catalog metadata — same pattern as other creative catalog
 * endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'angle-finder',
    creditCost: ANGLE_FINDER_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        targetAudience: `string (optional, max ${MAX_AUDIENCE_LENGTH} chars)`,
        dryRun: 'boolean (optional)',
      },
      output: {
        angles: 'CreativeAngle[]',
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

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, MAX_AUDIENCE_LENGTH) : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AngleFinderInput = {
    productOrBrand,
    platform,
    targetAudience,
    dryRun,
  };

  const validation = validateAngleFinderInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = ANGLE_FINDER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:angle-finder');
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
    const result = await findAngles(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:angle-finder').catch(() => {});
    const safe = safeError(e, 'creative/angle-finder', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
