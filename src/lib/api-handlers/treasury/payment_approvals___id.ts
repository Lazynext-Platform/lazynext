import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/payment-approvals/[id] — get a payment approval */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const paymentApproval = await TreasuryService.getPaymentApproval(id);
  if (!paymentApproval) {
    return NextResponse.json({ error: 'payment_approval_not_found' }, { status: 404 });
  }
  return NextResponse.json({ paymentApproval });
}

/** PATCH /api/treasury/payment-approvals/[id] — update a payment approval (e.g. status) */
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

  // Allow approve/reject via PATCH for convenience
  try {
    let result = null;
    if (body.status === 'approved') {
      result = await TreasuryService.approvePayment(id, session.user.id);
    } else if (body.status === 'rejected') {
      result = await TreasuryService.rejectPayment(id, body.reason || '', session.user.id);
    } else {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    if (!result) {
      return NextResponse.json({ error: 'payment_approval_not_found' }, { status: 404 });
    }
    return NextResponse.json({ paymentApproval: result });
  } catch (e) {
    console.error('[treasury/payment-approvals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_payment_approval' }, { status: 500 });
  }
}
