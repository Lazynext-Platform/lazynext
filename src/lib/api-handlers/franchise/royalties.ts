import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/royalties — list royalties */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ royalties: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { franchiseeId?: string; status?: string; period?: string } = {};
  const franchiseeId = url.searchParams.get('franchiseeId');
  const status = url.searchParams.get('status');
  const period = url.searchParams.get('period');
  if (franchiseeId) opts.franchiseeId = franchiseeId;
  if (status) opts.status = status;
  if (period) opts.period = period;

  const royalties = await FranchiseService.listRoyalties(organizationId, opts as never);
  return NextResponse.json({ royalties });
}

/** POST /api/franchise/royalties — create a royalty record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const franchiseeId = String(body.franchiseeId || '').trim();
  const period = String(body.period || '').trim();
  const grossSales = Number(body.grossSales ?? 0);
  const royaltyRate = Number(body.royaltyRate ?? 0);
  const totalAmount = Number(body.totalAmount ?? 0);
  if (!franchiseeId || !period) {
    return NextResponse.json({ error: 'franchiseeId_period_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const royalty = await FranchiseService.createRoyalty(
      ws.organizationId, ws.id,
      {
        franchiseeId, period, grossSales, royaltyRate, totalAmount,
        royaltyAmount: body.royaltyAmount,
        advertisingFundAmount: body.advertisingFundAmount, additionalFees: body.additionalFees,
        dueDate: body.dueDate, paidDate: body.paidDate, status: body.status,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ royalty }, { status: 201 });
  } catch (e) {
    console.error('[franchise/royalties] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_royalty' }, { status: 500 });
  }
}
