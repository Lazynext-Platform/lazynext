import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimeOffService } from '@/lib/services/time-off-service';

/** GET /api/hr/time-off/balance — get time-off balance for an employee */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId_required' }, { status: 400 });
  }

  const allowance = searchParams.get('allowance');
  const balance = await TimeOffService.getBalance(
    employeeId,
    allowance ? Number(allowance) : undefined,
  );
  return NextResponse.json({ balance });
}
