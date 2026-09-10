import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** POST /api/franchise/royalties/[id]/payment — record a royalty payment */
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
  const paidDate = String(body.paidDate || '').trim();
  if (!paidDate) {
    return NextResponse.json({ error: 'paidDate_required' }, { status: 400 });
  }

  try {
    const royalty = await FranchiseService.recordPayment(id, paidDate, session.user.id);
    if (!royalty) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ royalty });
  } catch (e) {
    console.error('[franchise/royalties/payment] error:', e);
    return NextResponse.json({ error: 'failed_to_record_payment' }, { status: 500 });
  }
}
