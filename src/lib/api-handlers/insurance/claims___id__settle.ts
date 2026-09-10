import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InsuranceService } from '@/lib/services/insurance-service';

/** POST /api/insurance/claims/[id]/settle — settle a claim */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (body.settlementAmount === undefined) {
    return NextResponse.json({ error: 'settlementAmount_required' }, { status: 400 });
  }

  try {
    const claim = await InsuranceService.settleClaim(
      id,
      Number(body.settlementAmount),
      body.settledBy || session.user.id,
    );
    if (!claim) {
      return NextResponse.json({ error: 'claim_not_found' }, { status: 404 });
    }
    return NextResponse.json({ claim });
  } catch (e) {
    console.error('[insurance/claims/settle] error:', e);
    return NextResponse.json({ error: 'failed_to_settle_claim' }, { status: 500 });
  }
}
