import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/payment-approvals — list payment approvals (query: organizationId, status) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ paymentApprovals: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const status = sp.get('status') as 'pending' | 'approved' | 'rejected' | 'paid' | null;
  const opts = status ? { status } : {};

  const paymentApprovals = await TreasuryService.listPaymentApprovals(organizationId, opts);
  return NextResponse.json({ paymentApprovals });
}

/** POST /api/treasury/payment-approvals — create a payment approval */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.payee || body.amount === undefined) {
    return NextResponse.json({ error: 'payee_amount_required' }, { status: 400 });
  }

  try {
    const paymentApproval = await TreasuryService.createPaymentApproval(
      organizationId,
      workspaceId,
      {
        payee: body.payee,
        amount: Number(body.amount),
        currency: body.currency,
        dueDate: body.dueDate,
        category: body.category,
        description: body.description,
        bankAccountId: body.bankAccountId,
      },
      session.user.id,
    );
    return NextResponse.json({ paymentApproval }, { status: 201 });
  } catch (e) {
    console.error('[treasury/payment-approvals] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_payment_approval' }, { status: 500 });
  }
}
