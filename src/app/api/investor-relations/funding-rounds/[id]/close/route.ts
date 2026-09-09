import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** POST /api/investor-relations/funding-rounds/[id]/close — close a funding round */
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
  const finalAmount = Number(body.finalAmount);
  if (!finalAmount) {
    return NextResponse.json({ error: 'final_amount_required' }, { status: 400 });
  }

  try {
    const fundingRound = await InvestorRelationsService.closeFundingRound(id, finalAmount, session.user.id);
    if (!fundingRound) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ fundingRound });
  } catch (e) {
    console.error('[investor-relations/funding-rounds] close error:', e);
    return NextResponse.json({ error: 'failed_to_close_funding_round' }, { status: 500 });
  }
}
