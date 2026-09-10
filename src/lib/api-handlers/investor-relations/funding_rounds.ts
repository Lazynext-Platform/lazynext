import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/funding-rounds — list funding rounds */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ fundingRounds: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; status?: string } = {};
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (type) opts.type = type;
  if (status) opts.status = status;

  const fundingRounds = await InvestorRelationsService.listFundingRounds(organizationId, opts as never);
  return NextResponse.json({ fundingRounds });
}

/** POST /api/investor-relations/funding-rounds — create a funding round */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const targetAmount = Number(body.targetAmount);
  if (!name || !type || !targetAmount) {
    return NextResponse.json({ error: 'name_type_and_target_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const fundingRound = await InvestorRelationsService.createFundingRound(
      ws.organizationId, ws.id,
      {
        name, type: type as never, targetAmount,
        raisedAmount: body.raisedAmount, preMoneyValuation: body.preMoneyValuation,
        postMoneyValuation: body.postMoneyValuation, dilution: body.dilution,
        leadInvestor: body.leadInvestor, participants: body.participants,
        status: body.status, startDate: body.startDate, closeDate: body.closeDate,
        terms: body.terms, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ fundingRound }, { status: 201 });
  } catch (e) {
    console.error('[investor-relations/funding-rounds] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_funding_round' }, { status: 500 });
  }
}
