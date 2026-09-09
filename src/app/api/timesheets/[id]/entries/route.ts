import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** GET /api/timesheets/[id]/entries — list time entries for a timesheet */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const entries = await TimesheetService.getTimeEntries(id);
  return NextResponse.json({ entries });
}

/** POST /api/timesheets/[id]/entries — add a time entry to a timesheet */
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
  const taskId = String(body.taskId || '').trim();
  const startedAt = body.startedAt ? new Date(body.startedAt) : null;
  if (!taskId || !startedAt) {
    return NextResponse.json({ error: 'taskId_and_startedAt_required' }, { status: 400 });
  }
  try {
    const entry = await TimesheetService.addTimeEntry(id, {
      taskId,
      userId: body.userId,
      durationSec: Number(body.durationSec) || 0,
      description: body.description,
      startedAt,
      endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
      billable: body.billable,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_add_entry';
    if (msg === 'timesheet_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[timesheets/entries] error:', e);
    return NextResponse.json({ error: 'failed_to_add_entry' }, { status: 500 });
  }
}
