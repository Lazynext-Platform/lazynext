import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/runs — list payroll runs */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ runs: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  try {
    const runs = await PayrollManagementService.listPayrollRuns(organizationId);
    return NextResponse.json({ runs });
  } catch (e) {
    console.error('[payroll-management/runs] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_runs' }, { status: 500 });
  }
}

/** POST /api/payroll-management/runs — create a payroll run */
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
  if (!body.period) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }

  try {
    const run = await PayrollManagementService.createPayrollRun(
      organizationId,
      workspaceId,
      {
        period: body.period,
        payDate: body.payDate ? new Date(body.payDate) : undefined,
        payPeriodStart: body.payPeriodStart ? new Date(body.payPeriodStart) : undefined,
        payPeriodEnd: body.payPeriodEnd ? new Date(body.payPeriodEnd) : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    console.error('[payroll-management/runs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_run' }, { status: 500 });
  }
}
