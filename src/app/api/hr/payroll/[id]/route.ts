import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollService } from '@/lib/services/payroll-service';

/** GET /api/hr/payroll/[id] — get a single payroll record */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const record = await PayrollService.get(id);
  if (!record) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ record });
}

/** PATCH /api/hr/payroll/[id] — update a payroll record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const record = await PayrollService.update(id, {
      employeeName: body.employeeName,
      grossAmount: body.grossAmount,
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
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[hr/payroll] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_record' }, { status: 500 });
  }
}

/** DELETE /api/hr/payroll/[id] — delete a payroll record */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await PayrollService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[hr/payroll] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_record' }, { status: 500 });
  }
}
