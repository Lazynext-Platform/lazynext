import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** POST /api/timesheets/[id]/submit — submit a timesheet for approval */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const timesheet = await TimesheetService.submit(id);
    return NextResponse.json({ timesheet });
  } catch (e) {
    console.error('[timesheets/submit] error:', e);
    return NextResponse.json({ error: 'failed_to_submit_timesheet' }, { status: 500 });
  }
}
