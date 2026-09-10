import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/chart-of-accounts — chart of accounts with balances */
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

  const accounts = await AccountingService.getChartOfAccounts(organizationId);
  return NextResponse.json({ accounts });
}
