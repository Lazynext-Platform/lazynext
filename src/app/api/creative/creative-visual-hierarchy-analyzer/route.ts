import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST,
  generateHierarchyAnalysis,
  validateCreativeVisualHierarchyAnalyzerInput,
  VALID_PLATFORMS,
  VALID_CONTENT_TYPES,
  DEFAULT_CONTENT_TYPE,
  MAX_LAYOUT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeVisualHierarchyAnalyzerInput,
} from '@/lib/creative/creative-visual-hierarchy-analyzer';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-visual-hierarchy-analyzer
 * Returns the credit cost, schema info, and supported platforms/content
 * types (no auth required for catalog metadata — same pattern as other
 * creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-visual-hierarchy-analyzer',
    creditCost: CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST,
    schema: {
      input: {
        layoutDescription: `string (required, max ${MAX_LAYOUT_LENGTH} chars)`,
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        contentType: `string (optional: ${VALID_CONTENT_TYPES.join(', ')} — default ${DEFAULT_CONTENT_TYPE})`,
        platform: 'string (optional: tiktok, instagram, youtube, facebook)',
        dryRun: 'boolean (optional)',
      },
      output: {
        analysis: 'HierarchyAnalysis',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      contentTypes: VALID_CONTENT_TYPES,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const layoutDescription =
    typeof body.layoutDescription === 'string' ? body.layoutDescription.trim().slice(0, MAX_LAYOUT_LENGTH) : '';

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const contentType =
    typeof body.contentType === 'string' && VALID_CONTENT_TYPES.includes(body.contentType as never)
      ? body.contentType
      : undefined;

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeVisualHierarchyAnalyzerInput = {
    layoutDescription,
    productOrBrand,
    contentType,
    platform,
    dryRun,
  };

  const validation = validateCreativeVisualHierarchyAnalyzerInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-visual-hierarchy-analyzer');
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
    const result = await generateHierarchyAnalysis(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-visual-hierarchy-analyzer').catch(() => {});
    const safe = safeError(e, 'creative/creative-visual-hierarchy-analyzer', 'generate_failed');
    return NextResponse.json(safe, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
