import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  mergeConcepts,
  validateAdConceptMergerInput,
  AD_CONCEPT_MERGER_CREDIT_COST,
  type AdConceptMergerInput,
  type ConceptInput,
  type ConceptType,
} from '@/lib/creative/ad-concept-merger';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/ad-concept-merger
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: AD_CONCEPT_MERGER_CREDIT_COST,
    schema: {
      input: {
        concepts: 'ConceptInput[] (required — 2-10 items, each with id, type, content)',
        targetPlatform: 'string (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        merged: {
          unifiedHook: 'string',
          unifiedAngle: 'string',
          unifiedScript: 'string',
          unifiedVisual: 'string',
          conflictResolutions: 'string[]',
          optimizationNotes: 'string[]',
          flowScore: 'number (0-100)',
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

  let concepts: ConceptInput[] = [];
  if (Array.isArray(body.concepts)) {
    concepts = body.concepts
      .filter((c: unknown) => c && typeof c === 'object')
      .slice(0, 10)
      .map((c: Record<string, unknown>) => ({
        id: typeof c.id === 'string' ? c.id.trim().slice(0, 200) : '',
        type: c.type as ConceptType,
        content: typeof c.content === 'string' ? c.content.trim().slice(0, 10000) : '',
        source: typeof c.source === 'string' ? c.source.trim().slice(0, 200) : undefined,
      }));
  }

  const targetPlatform =
    typeof body.targetPlatform === 'string' ? body.targetPlatform.trim().slice(0, 100) : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: AdConceptMergerInput = {
    concepts,
    targetPlatform,
    dryRun,
  };

  const validation = validateAdConceptMergerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, AD_CONCEPT_MERGER_CREDIT_COST, 'creative:ad-concept-merger');
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
    const result = await mergeConcepts(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, AD_CONCEPT_MERGER_CREDIT_COST, 'creative:ad-concept-merger');
    return NextResponse.json(safeError(e, 'creative/ad-concept-merger', 'merge_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
