import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { extractProduct, SSRFError } from '@/lib/brand/extract';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 90;

const PRODUCT_EXTRACT_COST = 3;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

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
    const extraction = await extractProduct(url);
    return NextResponse.json({ extraction });
  } catch (e) {
    await refundSync(uid, PRODUCT_EXTRACT_COST, 'brand:product-extract');
    if (e instanceof SSRFError) {
      return NextResponse.json({ error: 'url_blocked', reason: e.message }, { status: 400 });
    }
    console.error('[brand/product-extract] error:', String(e));
    return NextResponse.json({ error: 'extraction_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
