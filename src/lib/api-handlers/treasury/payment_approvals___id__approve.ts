import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TreasuryService } from '@/lib/services/treasury-service';

/** POST /api/treasury/payment-approvals/[id]/approve — approve a payment */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const paymentApproval = await TreasuryService.approvePayment(id, session.user.id);
    if (!paymentApproval) {
      return NextResponse.json({ error: 'payment_approval_not_found' }, { status: 404 });
    }
    return NextResponse.json({ paymentApproval });
  } catch (e) {
    console.error('[treasury/payment-approvals/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_payment' }, { status: 500 });
  }
}
