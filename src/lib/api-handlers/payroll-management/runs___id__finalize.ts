import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** POST /api/payroll-management/runs/[id]/finalize — finalize a payroll run */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  try {
    const run = await PayrollManagementService.finalizePayrollRun(id, organizationId);
    return NextResponse.json({ run });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_finalize_run';
    if (msg === 'payroll_run_not_found' || msg === 'payroll_run_no_period') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('[payroll-management/runs/finalize] error:', e);
    return NextResponse.json({ error: 'failed_to_finalize_run' }, { status: 500 });
  }
}
