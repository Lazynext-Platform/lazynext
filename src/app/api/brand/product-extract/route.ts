import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { extractProduct, SSRFError } from '@/lib/brand/extract';
import { deductCredits, refundCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const PRODUCT_EXTRACT_COST = 3;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 });
  }

  try {
    await deductCredits(uid, PRODUCT_EXTRACT_COST, 'brand:product-extract');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const extraction = await extractProduct(url, planTier);
    // Persist to AdProduct table for reuse in workflows
    const adProduct = await prisma.adProduct.create({
      data: {
        userId: uid,
        name: extraction.productName || 'Extracted Product',
        description: extraction.description || `${extraction.productName}: ${extraction.benefits.join(', ')}`,
        imageUrl: extraction.images[0] || null,
        sourceUrl: url,
      },
    }).catch(() => null); // non-fatal — return extraction even if DB save fails
    return NextResponse.json({ extraction, adProductId: adProduct?.id || null });
  } catch (e) {
    await refundCredits(uid, PRODUCT_EXTRACT_COST, 'brand:product-extract');
    if (e instanceof SSRFError) {
      return NextResponse.json({ error: 'url_blocked' }, { status: 400 });
    }
    console.error('[brand/product-extract] error:', String(e));
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
