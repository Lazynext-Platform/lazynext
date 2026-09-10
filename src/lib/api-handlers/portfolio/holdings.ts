import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/holdings — list portfolio holdings */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ holdings: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { assetClass?: string; status?: string; sector?: string } = {};
  const assetClass = url.searchParams.get('assetClass');
  const status = url.searchParams.get('status');
  const sector = url.searchParams.get('sector');
  if (assetClass) opts.assetClass = assetClass;
  if (status) opts.status = status;
  if (sector) opts.sector = sector;

  const holdings = await PortfolioService.listHoldings(organizationId, opts as never);
  return NextResponse.json({ holdings });
}

/** POST /api/portfolio/holdings — create a portfolio holding */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const assetClass = String(body.assetClass || '').trim();
  const quantity = Number(body.quantity);
  const purchasePrice = Number(body.purchasePrice);
  const purchaseDate = String(body.purchaseDate || '').trim();
  if (!name || !assetClass || !quantity || !purchasePrice || !purchaseDate) {
    return NextResponse.json({ error: 'name_assetClass_quantity_purchasePrice_purchaseDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const holding = await PortfolioService.createHolding(
      ws.organizationId, ws.id,
      {
        name, assetClass: assetClass as never,
        quantity, purchasePrice, purchaseDate,
        ticker: body.ticker, isin: body.isin, currentPrice: body.currentPrice,
        currency: body.currency, status: body.status, sector: body.sector,
        country: body.country, rating: body.rating, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ holding }, { status: 201 });
  } catch (e) {
    console.error('[portfolio/holdings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_holding' }, { status: 500 });
  }
}
