import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/runs/[id] — get a single payroll run */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const run = await PayrollManagementService.getPayrollRun(id);
  if (!run) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ run });
}
