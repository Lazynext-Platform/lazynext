import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/accounts — list bank accounts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { accountType?: string; status?: string; bankName?: string } = {};
  const accountType = url.searchParams.get('accountType');
  const status = url.searchParams.get('status');
  const bankName = url.searchParams.get('bankName');
  if (accountType) opts.accountType = accountType;
  if (status) opts.status = status;
  if (bankName) opts.bankName = bankName;

  const accounts = await BankingService.listAccounts(organizationId, opts as never);
  return NextResponse.json({ accounts });
}

/** POST /api/banking/accounts — create a bank account */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountName = String(body.accountName || '').trim();
  const accountNumber = String(body.accountNumber || '').trim();
  const bankName = String(body.bankName || '').trim();
  const accountType = String(body.accountType || '').trim();
  if (!accountName || !accountNumber || !bankName || !accountType) {
    return NextResponse.json({ error: 'name_number_bank_type_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const account = await BankingService.createAccount(
      ws.organizationId, ws.id,
      {
        accountName, accountNumber, bankName,
        accountType: accountType as never,
        routingNumber: body.routingNumber, currency: body.currency,
        balance: body.balance, status: body.status,
        openedDate: body.openedDate, description: body.description,
      },
      session.user.id,
    );
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    console.error('[banking/accounts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_account' }, { status: 500 });
  }
}
