import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/[id] — get a single payroll record */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const record = await PayrollManagementService.getPayrollRecord(id);
  if (!record) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ record });
}

/** PATCH /api/payroll-management/[id] — update a payroll record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const record = await PayrollManagementService.updatePayrollRecord(id, {
      employeeName: body.employeeName,
      employeeId: body.employeeId,
      period: body.period,
      grossAmount: body.grossAmount !== undefined ? Number(body.grossAmount) : undefined,
      taxWithheld: body.taxWithheld !== undefined ? Number(body.taxWithheld) : undefined,
      netAmount: body.netAmount !== undefined ? Number(body.netAmount) : undefined,
      benefits: body.benefits !== undefined ? Number(body.benefits) : undefined,
      deductions: body.deductions !== undefined ? Number(body.deductions) : undefined,
      status: body.status,
      payDate: body.payDate !== undefined ? (body.payDate ? new Date(body.payDate) : null) : undefined,
      payPeriodStart: body.payPeriodStart !== undefined ? (body.payPeriodStart ? new Date(body.payPeriodStart) : null) : undefined,
      payPeriodEnd: body.payPeriodEnd !== undefined ? (body.payPeriodEnd ? new Date(body.payPeriodEnd) : null) : undefined,
      currency: body.currency,
    });
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[payroll-management] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_record' }, { status: 500 });
  }
}
