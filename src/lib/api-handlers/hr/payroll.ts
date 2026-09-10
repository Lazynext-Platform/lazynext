import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollService } from '@/lib/services/payroll-service';

/** GET /api/hr/payroll — list payroll records */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const { searchParams } = new URL(req.url);
  const filters: {
    employeeId?: string;
    status?: string;
    dateRange?: { start?: Date; end?: Date };
  } = {};
  const employeeId = searchParams.get('employeeId') || undefined;
  const status = searchParams.get('status') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (employeeId) filters.employeeId = employeeId;
  if (status) filters.status = status;
  if (startDate || endDate) {
    filters.dateRange = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    };
  }

  const records = await PayrollService.list(organizationId, filters);
  return NextResponse.json({ records });
}

/** POST /api/hr/payroll — create a payroll record */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const employeeName = String(body.employeeName || '').trim();
  if (!employeeName) {
    return NextResponse.json({ error: 'employee_name_required' }, { status: 400 });
  }
  if (body.grossAmount == null) {
    return NextResponse.json({ error: 'gross_amount_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const record = await PayrollService.create({
      organizationId,
      workspaceId: body.workspaceId,
      employeeName,
      employeeId: body.employeeId,
      hrEmployeeId: body.hrEmployeeId,
      period: body.period,
      grossAmount: Number(body.grossAmount),
      taxWithheld: body.taxWithheld,
      netAmount: body.netAmount,
      benefits: body.benefits,
      deductions: body.deductions,
      status: body.status,
      payDate: body.payDate ? new Date(body.payDate) : undefined,
      payPeriodStart: body.payPeriodStart ? new Date(body.payPeriodStart) : undefined,
      payPeriodEnd: body.payPeriodEnd ? new Date(body.payPeriodEnd) : undefined,
      currency: body.currency,
      payType: body.payType,
      hoursWorked: body.hoursWorked,
      overtimeHours: body.overtimeHours,
      metadata: body.metadata,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[hr/payroll] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_record' }, { status: 500 });
  }
}
