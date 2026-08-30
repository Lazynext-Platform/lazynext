import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  buildBriefTemplate,
  validateBriefTemplateBuilderInput,
  BRIEF_TEMPLATE_BUILDER_CREDIT_COST,
  INDUSTRY_PRESETS,
  VALID_INDUSTRIES,
  type BriefTemplateBuilderInput,
  type BrandKitRef,
  type Industry,
} from '@/lib/creative/brief-template-builder';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/brief-template-builder
 * Returns the credit cost, schema info, and available industry presets (no auth
 * required for catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: BRIEF_TEMPLATE_BUILDER_CREDIT_COST,
    schema: {
      input: {
        industry: 'Industry (required)',
        productCategory: 'string (required)',
        brandKit: 'BrandKitRef (optional)',
        productUrl: 'string (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        template: 'BriefTemplate',
        industry: 'Industry',
        dryRun: 'boolean',
      },
    },
    industries: VALID_INDUSTRIES,
    presets: Object.values(INDUSTRY_PRESETS).map((p) => ({
      industry: p.industry,
      label: p.label,
    })),
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const industry =
    typeof body.industry === 'string' && VALID_INDUSTRIES.includes(body.industry as Industry)
      ? (body.industry as Industry)
      : '';
  if (!industry) {
    return NextResponse.json({ error: 'industry_invalid' }, { status: 400 });
  }

  const productCategory =
    typeof body.productCategory === 'string' ? body.productCategory.trim().slice(0, 500) : '';
  if (!productCategory) {
    return NextResponse.json({ error: 'product_category_required' }, { status: 400 });
  }

  const brandKit =
    body.brandKit && typeof body.brandKit === 'object' && !Array.isArray(body.brandKit)
      ? (body.brandKit as BrandKitRef)
      : undefined;

  const productUrl =
    typeof body.productUrl === 'string' && body.productUrl.trim()
      ? body.productUrl.trim().slice(0, 2000)
      : undefined;

  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: BriefTemplateBuilderInput = {
    industry,
    productCategory,
    brandKit,
    productUrl,
    dryRun,
  };

  const validation = validateBriefTemplateBuilderInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, BRIEF_TEMPLATE_BUILDER_CREDIT_COST, 'creative:brief-template-builder');
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
    const result = await buildBriefTemplate(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, BRIEF_TEMPLATE_BUILDER_CREDIT_COST, 'creative:brief-template-builder');
    return NextResponse.json(safeError(e, 'creative/brief-template-builder', 'brief_template_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
