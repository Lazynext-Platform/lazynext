import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** POST /api/timesheets/[id]/recalculate — recalculate totals */
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
    const timesheet = await TimesheetService.recalculateTotals(id);
    return NextResponse.json({ timesheet });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_recalculate';
    if (msg === 'timesheet_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[timesheets/recalculate] error:', e);
    return NextResponse.json({ error: 'failed_to_recalculate' }, { status: 500 });
  }
}
