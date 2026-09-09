import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** POST /api/timesheets/[id]/reject — reject a timesheet */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }
  try {
    const timesheet = await TimesheetService.reject(id, session.user.id, reason);
    return NextResponse.json({ timesheet });
  } catch (e) {
    console.error('[timesheets/reject] error:', e);
    return NextResponse.json({ error: 'failed_to_reject_timesheet' }, { status: 500 });
  }
}
