import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollService } from '@/lib/services/payroll-service';

/** POST /api/hr/payroll/generate — auto-generate payroll for all active employees */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  const body = await req.json().catch(() => ({}));

  try {
    const records = await PayrollService.generatePayroll(organizationId, body.period);
    return NextResponse.json({ records, count: records.length });
  } catch (e) {
    console.error('[hr/payroll] generate error:', e);
    return NextResponse.json({ error: 'failed_to_generate_payroll' }, { status: 500 });
  }
}
