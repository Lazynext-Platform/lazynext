import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** POST /api/portfolio/holdings/[id]/sell — sell a portfolio holding */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const sellPrice = Number(body.sellPrice);
  const sellDate = String(body.sellDate || '').trim();
  if (!sellPrice || !sellDate) {
    return NextResponse.json({ error: 'sellPrice_sellDate_required' }, { status: 400 });
  }

  try {
    const holding = await PortfolioService.sellHolding(id, sellPrice, sellDate, session.user.id);
    if (!holding) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ holding });
  } catch (e) {
    console.error('[portfolio/holdings/sell] error:', e);
    return NextResponse.json({ error: 'failed_to_sell_holding' }, { status: 500 });
  }
}
