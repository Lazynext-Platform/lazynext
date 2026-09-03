import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { remixFromReference, analyzeReferenceCreative, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { ReferenceCreativeAnalysis } from '@/lib/creative/types';
import type { BrandProfile, ProductExtraction } from '@/lib/brand/types';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getTool, validateAgainstSchema } from '@/lib/creative/tools';
import { getUserPlanTier } from '@/lib/plan-tier';
import { isUrlSafe } from '@/lib/security';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Either provide a pre-computed analysis, or a referenceUrl to analyze
  let analysis: ReferenceCreativeAnalysis | undefined = body.analysis as ReferenceCreativeAnalysis | undefined;
  const referenceUrl = typeof body.referenceUrl === 'string' && isUrlSafe(body.referenceUrl) ? body.referenceUrl.trim().slice(0, 2048) : '';

  if (!analysis && referenceUrl) {
    // Validate URL format
    try {
      const parsed = new URL(referenceUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }
    // Analyze the reference first (costs extra credits)
    try {
      await deductCredits(uid, CREATIVE_COSTS.referenceAnalysis, 'creative:remix:analysis');
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
        { status: 402 },
      );
    }
    try {
      analysis = await analyzeReferenceCreative(referenceUrl, undefined, planTier);
    } catch (e) {
      await refundCredits(uid, CREATIVE_COSTS.referenceAnalysis, 'creative:remix:analysis');
      console.error('[creative/remix] reference analysis error:', String(e));
      return NextResponse.json({ error: 'reference_analysis_failed' }, { status: 500 });
    }
  }

  if (!analysis) {
    return NextResponse.json({ error: 'analysis_or_referenceUrl_required' }, { status: 400 });
  }

  const product = typeof body.product === 'string' ? body.product.trim() : '';
  if (!product) return NextResponse.json({ error: 'product_required' }, { status: 400 });

  // Validate the resolved input against the creative.remix tool schema
  const remixTool = getTool('creative.remix');
  if (remixTool) {
    const validationErrors = validateAgainstSchema(
      { analysis, product, productName: body.productName, platform: body.platform, format: body.format },
      remixTool.inputSchema,
    );
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'validation_failed', detail: validationErrors }, { status: 400 });
    }
  }

  // Charge for the remix brief generation
  try {
    await deductCredits(uid, CREATIVE_COSTS.remix, 'creative:remix');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const brief = await remixFromReference({
      analysis,
      product,
      productName: body.productName,
      brand: body.brand as BrandProfile | null | undefined,
      productExtraction: body.productExtraction as ProductExtraction | null | undefined,
      platform: body.platform,
      format: body.format,
      planTier,
    });
    return NextResponse.json({ tool: 'creative.remix', cost: CREATIVE_COSTS.remix, brief, analysis });
  } catch (e) {
    await refundCredits(uid, CREATIVE_COSTS.remix, 'creative:remix');
    console.error('[creative/remix] error:', String(e));
    return NextResponse.json({ error: 'remix_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
