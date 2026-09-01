import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateMoodBoard,
  validateMoodBoardGeneratorInput,
  MOOD_BOARD_GENERATOR_CREDIT_COST,
  type MoodBoardGeneratorInput,
} from '@/lib/creative/mood-board-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/mood-board-generator
 * Returns the credit cost and schema info. No auth required for catalog
 * metadata — same pattern as other creative catalog endpoints.
 */
export async function GET() {
  return NextResponse.json({
    creditCost: MOOD_BOARD_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: 'string (required, max 2000 chars)',
        styleKeywords: 'string[] (optional)',
        targetAudience: 'string (optional, max 1000 chars)',
        platform: 'string (optional, max 100 chars)',
        dryRun: 'boolean (optional)',
      },
      output: {
        moodBoard: 'MoodBoard',
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

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, 2000) : '';
  if (!productOrBrand) {
    return NextResponse.json({ error: 'product_or_brand_required' }, { status: 400 });
  }

  const styleKeywords = Array.isArray(body.styleKeywords) ? body.styleKeywords : undefined;
  const targetAudience =
    typeof body.targetAudience === 'string' && body.targetAudience.trim()
      ? body.targetAudience.trim().slice(0, 1000)
      : undefined;
  const platform =
    typeof body.platform === 'string' && body.platform.trim()
      ? body.platform.trim().slice(0, 100)
      : undefined;
  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: MoodBoardGeneratorInput = {
    productOrBrand,
    styleKeywords,
    targetAudience,
    platform,
    dryRun,
  };

  const validation = validateMoodBoardGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, MOOD_BOARD_GENERATOR_CREDIT_COST, 'creative:mood-board-generator');
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
    const result = await generateMoodBoard(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, MOOD_BOARD_GENERATOR_CREDIT_COST, 'creative:mood-board-generator');
    const { error, status } = safeAtlasError(e, 'creative/mood-board-generator', 'mood_board_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
