import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/accounts/[id] — get a single bank account */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const account = await BankingService.getAccount(id);
  if (!account) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ account });
}

/** PATCH /api/banking/accounts/[id] — update a bank account */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const account = await BankingService.updateAccount(id, {
      accountName: body.accountName, accountNumber: body.accountNumber,
      bankName: body.bankName, routingNumber: body.routingNumber,
      accountType: body.accountType, currency: body.currency,
      balance: body.balance, status: body.status,
      openedDate: body.openedDate, description: body.description,
    });
    if (!account) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ account });
  } catch (e) {
    console.error('[banking/accounts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_account' }, { status: 500 });
  }
}

/** DELETE /api/banking/accounts/[id] — delete a bank account */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await BankingService.deleteAccount(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
