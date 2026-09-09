import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ holdings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['accountId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const holdings = await PortfolioManagementService.listHoldings(organizationId, opts as never);
  return NextResponse.json({ holdings });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const accountId = String(body.accountId || '').trim();
  const symbol = String(body.symbol || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!accountId || !symbol || !name || !type) return NextResponse.json({ error: 'accountId_symbol_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const holding = await PortfolioManagementService.createHolding(ws.organizationId, ws.id, {
      accountId, symbol, name, type: type as never,
      description: body.description, status: body.status, quantity: body.quantity,
      avgCost: body.avgCost, currentPrice: body.currentPrice, marketValue: body.marketValue,
      currency: body.currency, sector: body.sector, acquiredDate: body.acquiredDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ holding }, { status: 201 });
  } catch (e) {
    console.error('[portfolio-management/holdings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_holding' }, { status: 500 });
  }
}
