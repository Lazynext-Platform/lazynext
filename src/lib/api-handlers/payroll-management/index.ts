import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management — list payroll records (query: organizationId, period, status, employeeId) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { period?: string; status?: string; employeeId?: string } = {};
  const period = sp.get('period');
  const status = sp.get('status');
  const employeeId = sp.get('employeeId');
  if (period) opts.period = period;
  if (status) opts.status = status;
  if (employeeId) opts.employeeId = employeeId;

  try {
    const records = await PayrollManagementService.listPayrollRecords(organizationId, opts);
    return NextResponse.json({ records });
  } catch (e) {
    console.error('[payroll-management] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_records' }, { status: 500 });
  }
}

/** POST /api/payroll-management — create a payroll record */
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
  if (!body.employeeName || !body.period || body.grossAmount === undefined) {
    return NextResponse.json({ error: 'employeeName_period_grossAmount_required' }, { status: 400 });
  }

  try {
    const record = await PayrollManagementService.addPayrollRecord(organizationId, {
      employeeName: body.employeeName,
      employeeId: body.employeeId,
      period: body.period,
      grossAmount: Number(body.grossAmount),
      taxWithheld: body.taxWithheld !== undefined ? Number(body.taxWithheld) : undefined,
      netAmount: body.netAmount !== undefined ? Number(body.netAmount) : undefined,
      benefits: body.benefits !== undefined ? Number(body.benefits) : undefined,
      deductions: body.deductions !== undefined ? Number(body.deductions) : undefined,
      payDate: body.payDate ? new Date(body.payDate) : undefined,
      payPeriodStart: body.payPeriodStart ? new Date(body.payPeriodStart) : undefined,
      payPeriodEnd: body.payPeriodEnd ? new Date(body.payPeriodEnd) : undefined,
      currency: body.currency,
      workspaceId: body.workspaceId,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[payroll-management] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_record' }, { status: 500 });
  }
}
