import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/accounts/balance/[id] — get account balance */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  try {
    const balance = await AccountingService.getAccountBalance(organizationId, id);
    return NextResponse.json({ balance });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_get_balance';
    if (msg === 'account_not_found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('[accounting/balance] error:', e);
    return NextResponse.json({ error: 'failed_to_get_balance' }, { status: 500 });
  }
}
