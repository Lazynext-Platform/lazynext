import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/payslip/[id] — generate a payslip for a record */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const payslip = await PayrollManagementService.generatePayslip(id);
    if (!payslip) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ payslip });
  } catch (e) {
    console.error('[payroll-management/payslip] error:', e);
    return NextResponse.json({ error: 'failed_to_generate_payslip' }, { status: 500 });
  }
}
