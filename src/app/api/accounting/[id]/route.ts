import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/[id] — get a single GL account */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const account = await AccountingService.getAccount(id);
  if (!account) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ account });
}

/** PATCH /api/accounting/[id] — update a GL account */
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
    const account = await AccountingService.updateAccount(id, {
      code: body.code,
      name: body.name,
      type: body.type,
      subtype: body.subtype,
      parentAccountId: body.parentAccountId,
      isActive: body.isActive,
      openingBalance: body.openingBalance,
      currency: body.currency,
    });
    return NextResponse.json({ account });
  } catch (e) {
    console.error('[accounting] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_account' }, { status: 500 });
  }
}

/** DELETE /api/accounting/[id] — delete a GL account */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await AccountingService.deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_delete_account';
    if (msg === 'account_has_journal_lines') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[accounting] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_account' }, { status: 500 });
  }
}
