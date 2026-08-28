import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { remixFromReference, analyzeReferenceCreative, CREATIVE_COSTS } from '@/lib/creative/intelligence';
import type { ReferenceCreativeAnalysis } from '@/lib/creative/types';
import type { BrandProfile, ProductExtraction } from '@/lib/brand/types';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));

  // Either provide a pre-computed analysis, or a referenceUrl to analyze
  let analysis: ReferenceCreativeAnalysis | undefined = body.analysis as ReferenceCreativeAnalysis | undefined;
  const referenceUrl = typeof body.referenceUrl === 'string' ? body.referenceUrl.trim() : '';

  if (!analysis && referenceUrl) {
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
      analysis = await analyzeReferenceCreative(referenceUrl);
    } catch (e) {
      await refundSync(uid, CREATIVE_COSTS.referenceAnalysis, 'creative:remix:analysis');
      return NextResponse.json({ error: 'reference_analysis_failed', detail: String(e) }, { status: 500 });
    }
  }

  if (!analysis) {
    return NextResponse.json({ error: 'analysis_or_referenceUrl_required' }, { status: 400 });
  }

  const product = typeof body.product === 'string' ? body.product.trim() : '';
  if (!product) return NextResponse.json({ error: 'product_required' }, { status: 400 });

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
    });
    return NextResponse.json({ brief, analysis });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.remix, 'creative:remix');
    console.error('[creative/remix] error:', String(e));
    return NextResponse.json({ error: 'remix_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
