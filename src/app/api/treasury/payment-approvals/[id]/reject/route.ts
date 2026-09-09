import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TreasuryService } from '@/lib/services/treasury-service';

/** POST /api/treasury/payment-approvals/[id]/reject — reject a payment */
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
  const reason = typeof body.reason === 'string' ? body.reason : '';

  try {
    const paymentApproval = await TreasuryService.rejectPayment(id, reason, session.user.id);
    if (!paymentApproval) {
      return NextResponse.json({ error: 'payment_approval_not_found' }, { status: 404 });
    }
    return NextResponse.json({ paymentApproval });
  } catch (e) {
    console.error('[treasury/payment-approvals/reject] error:', e);
    return NextResponse.json({ error: 'failed_to_reject_payment' }, { status: 500 });
  }
}
