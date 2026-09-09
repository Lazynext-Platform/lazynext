import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/bank-accounts/[id] — get a bank account */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const bankAccount = await TreasuryService.getBankAccount(id);
  if (!bankAccount) {
    return NextResponse.json({ error: 'bank_account_not_found' }, { status: 404 });
  }
  return NextResponse.json({ bankAccount });
}

/** PATCH /api/treasury/bank-accounts/[id] — update a bank account */
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
    const bankAccount = await TreasuryService.updateBankAccount(id, {
      name: body.name,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      currency: body.currency,
      balance: body.balance !== undefined ? Number(body.balance) : undefined,
      type: body.type,
      isActive: body.isActive,
    });
    if (!bankAccount) {
      return NextResponse.json({ error: 'bank_account_not_found' }, { status: 404 });
    }
    return NextResponse.json({ bankAccount });
  } catch (e) {
    console.error('[treasury/bank-accounts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_bank_account' }, { status: 500 });
  }
}

/** DELETE /api/treasury/bank-accounts/[id] — delete a bank account */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ok = await TreasuryService.deleteBankAccount(id);
  if (!ok) {
    return NextResponse.json({ error: 'bank_account_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
