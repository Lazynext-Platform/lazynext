import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/bank-accounts — list bank accounts (query: organizationId, type, isActive) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ bankAccounts: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { type?: 'checking' | 'savings' | 'credit' | 'investment'; isActive?: boolean } = {};
  const type = sp.get('type');
  const isActive = sp.get('isActive');
  if (type) opts.type = type as 'checking' | 'savings' | 'credit' | 'investment';
  if (isActive === 'true') opts.isActive = true;
  if (isActive === 'false') opts.isActive = false;

  const bankAccounts = await TreasuryService.listBankAccounts(organizationId, opts);
  return NextResponse.json({ bankAccounts });
}

/** POST /api/treasury/bank-accounts — create a bank account */
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
  if (!body.name || !body.bankName) {
    return NextResponse.json({ error: 'name_bankName_required' }, { status: 400 });
  }

  try {
    const bankAccount = await TreasuryService.createBankAccount(
      organizationId,
      workspaceId,
      {
        name: body.name,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        currency: body.currency,
        balance: body.balance !== undefined ? Number(body.balance) : undefined,
        type: body.type,
        isActive: body.isActive,
      },
      session.user.id,
    );
    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (e) {
    console.error('[treasury/bank-accounts] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_bank_account' }, { status: 500 });
  }
}
