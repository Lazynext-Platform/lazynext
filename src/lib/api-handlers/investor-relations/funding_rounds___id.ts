import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/funding-rounds/[id] — get a single funding round */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const fundingRound = await InvestorRelationsService.getFundingRound(id);
  if (!fundingRound) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ fundingRound });
}

/** PATCH /api/investor-relations/funding-rounds/[id] — update a funding round */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const fundingRound = await InvestorRelationsService.updateFundingRound(id, {
      name: body.name, type: body.type, targetAmount: body.targetAmount,
      raisedAmount: body.raisedAmount, preMoneyValuation: body.preMoneyValuation,
      postMoneyValuation: body.postMoneyValuation, dilution: body.dilution,
      leadInvestor: body.leadInvestor, participants: body.participants,
      status: body.status, startDate: body.startDate, closeDate: body.closeDate,
      terms: body.terms, notes: body.notes,
    });
    if (!fundingRound) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ fundingRound });
  } catch (e) {
    console.error('[investor-relations/funding-rounds] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_funding_round' }, { status: 500 });
  }
}
