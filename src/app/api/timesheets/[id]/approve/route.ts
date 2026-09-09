import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** POST /api/timesheets/[id]/approve — approve a timesheet */
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
    const timesheet = await TimesheetService.approve(id, session.user.id);
    return NextResponse.json({ timesheet });
  } catch (e) {
    console.error('[timesheets/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve_timesheet' }, { status: 500 });
  }
}
