import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  checkBrandGuardrails,
  validateBrandGuardrailsInput,
  BRAND_GUARDRAILS_CREDIT_COST,
  type BrandGuardrailsInput,
  type BrandKit,
} from '@/lib/creative/brand-guardrails';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brand-guardrails
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: BRAND_GUARDRAILS_CREDIT_COST,
    schema: {
      input: {
        brief: 'string (required)',
        script: 'string (optional)',
        storyboard: 'string (optional)',
        brandKit: 'BrandKit (required)',
        dryRun: 'boolean (optional)',
      },
      output: {
        score: 'number (0-100)',
        grade: 'BrandGuardrailsGrade (F-A+)',
        violations: 'BrandViolation[]',
        recommendations: 'string[]',
        voiceConsistency: 'number (0-100)',
        visualConsistency: 'number (0-100)',
        messagingConsistency: 'number (0-100)',
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

  const brief =
    typeof body.brief === 'string' ? body.brief.trim().slice(0, 10000) : '';
  if (!brief) {
    return NextResponse.json({ error: 'brief_required' }, { status: 400 });
  }

  const script =
    typeof body.script === 'string' && body.script.trim()
      ? body.script.trim().slice(0, 10000)
      : undefined;

  const storyboard =
    typeof body.storyboard === 'string' && body.storyboard.trim()
      ? body.storyboard.trim().slice(0, 10000)
      : undefined;

  const brandKit =
    body.brandKit && typeof body.brandKit === 'object' ? (body.brandKit as BrandKit) : undefined;
  if (!brandKit) {
    return NextResponse.json({ error: 'brand_kit_required' }, { status: 400 });
  }

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BrandGuardrailsInput = {
    brief,
    script,
    storyboard,
    brandKit,
    dryRun,
  };

  const validation = validateBrandGuardrailsInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, BRAND_GUARDRAILS_CREDIT_COST, 'creative:brand-guardrails');
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
    const result = await checkBrandGuardrails(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, BRAND_GUARDRAILS_CREDIT_COST, 'creative:brand-guardrails');
    return NextResponse.json(safeError(e, 'creative/brand-guardrails', 'brand_guardrails_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
