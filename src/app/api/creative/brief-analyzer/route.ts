import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  analyzeBrief,
  validateBriefAnalyzerInput,
  BRIEF_ANALYZER_CREDIT_COST,
  type BriefAnalyzerInput,
} from '@/lib/creative/brief-analyzer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brief-analyzer
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: BRIEF_ANALYZER_CREDIT_COST,
    schema: {
      input: {
        briefText: 'string (required, 50-10000 chars)',
        industry: 'string (optional, max 100 chars)',
        dryRun: 'boolean (optional)',
      },
      output: {
        analysis: {
          overallScore: 'number (0-100)',
          grade: 'BriefGrade (F-A+)',
          sections: 'BriefSection[]',
          gaps: 'BriefGap[]',
          strengths: 'string[]',
          weaknesses: 'string[]',
          recommendations: 'string[]',
          predictedEffectiveness: 'string',
        },
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

  const briefText =
    typeof body.briefText === 'string' ? body.briefText.trim().slice(0, 10000) : '';

  const industry =
    typeof body.industry === 'string' && body.industry.trim()
      ? body.industry.trim().slice(0, 100)
      : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BriefAnalyzerInput = {
    briefText,
    industry,
    dryRun,
  };

  const validation = validateBriefAnalyzerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, BRIEF_ANALYZER_CREDIT_COST, 'creative:brief-analyzer');
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
    const result = await analyzeBrief(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, BRIEF_ANALYZER_CREDIT_COST, 'creative:brief-analyzer');
    const { error, status } = safeAtlasError(e, 'creative/brief-analyzer', 'brief_analyzer_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
