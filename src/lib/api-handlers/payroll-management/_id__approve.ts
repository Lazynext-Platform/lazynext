import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** POST /api/payroll-management/[id]/approve — approve a payroll record */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const record = await PayrollManagementService.approvePayrollRecord(id);
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[payroll-management] approve error:', e);
    return NextResponse.json({ error: 'failed_to_approve_record' }, { status: 500 });
  }
}
