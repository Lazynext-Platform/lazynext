import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/employees/[id]/reports — get direct reports for a manager */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const reports = await EmployeeService.getDirectReports(id);
  return NextResponse.json({ reports });
}
