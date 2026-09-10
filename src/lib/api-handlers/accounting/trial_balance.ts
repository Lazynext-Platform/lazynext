import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/trial-balance — trial balance */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ lines: [], totalDebits: 0, totalCredits: 0 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const asOf = sp.get('asOfDate');
  const opts = asOf ? { asOfDate: new Date(asOf) } : undefined;

  const trial = await AccountingService.getTrialBalance(organizationId, opts);
  return NextResponse.json(trial);
}
