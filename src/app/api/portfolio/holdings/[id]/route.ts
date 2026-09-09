import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/holdings/[id] — get a single portfolio holding */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const holding = await PortfolioService.getHolding(id);
  if (!holding) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ holding });
}

/** PATCH /api/portfolio/holdings/[id] — update a portfolio holding */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const holding = await PortfolioService.updateHolding(id, {
      name: body.name, assetClass: body.assetClass, ticker: body.ticker,
      isin: body.isin, quantity: body.quantity, purchasePrice: body.purchasePrice,
      currentPrice: body.currentPrice, purchaseDate: body.purchaseDate,
      currency: body.currency, status: body.status, sector: body.sector,
      country: body.country, rating: body.rating, notes: body.notes,
    });
    if (!holding) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ holding });
  } catch (e) {
    console.error('[portfolio/holdings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_holding' }, { status: 500 });
  }
}

/** DELETE /api/portfolio/holdings/[id] — delete a portfolio holding */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await PortfolioService.deleteHolding(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
