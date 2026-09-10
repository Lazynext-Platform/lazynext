import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** POST /api/ip/trade-secrets/[id]/review — review a trade secret */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const tradeSecret = await IPService.reviewTradeSecret(id, session.user.id);
    if (!tradeSecret) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ tradeSecret });
  } catch (e) {
    console.error('[ip/trade-secrets/review] error:', e);
    return NextResponse.json({ error: 'failed_to_review_trade_secret' }, { status: 500 });
  }
}
