import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting — list GL accounts (query: organizationId, type, isActive) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { type?: string; isActive?: boolean } = {};
  const type = sp.get('type');
  const isActive = sp.get('isActive');
  if (type) opts.type = type;
  if (isActive === 'true') opts.isActive = true;
  if (isActive === 'false') opts.isActive = false;

  const accounts = await AccountingService.listAccounts(organizationId, opts);
  return NextResponse.json({ accounts });
}

/** POST /api/accounting — create a GL account */
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
  if (!body.code || !body.name || !body.type) {
    return NextResponse.json({ error: 'code_name_type_required' }, { status: 400 });
  }

  try {
    const account = await AccountingService.createAccount(organizationId, {
      code: body.code,
      name: body.name,
      type: body.type,
      subtype: body.subtype,
      parentAccountId: body.parentAccountId,
      openingBalance: body.openingBalance,
      currency: body.currency,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_create_account';
    if (msg === 'account_code_already_exists') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[accounting] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_account' }, { status: 500 });
  }
}
