import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** POST /api/accounting/close-period — close an accounting period */
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
  if (!body.period) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }

  try {
    const result = await AccountingService.closePeriod(organizationId, body.period);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error('[accounting/close-period] error:', e);
    return NextResponse.json({ error: 'failed_to_close_period' }, { status: 500 });
  }
}
