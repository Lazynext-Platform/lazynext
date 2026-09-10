import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** GET /api/timesheets/[id] — get a single timesheet */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const timesheet = await TimesheetService.get(id);
  if (!timesheet) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ timesheet });
}

/** PATCH /api/timesheets/[id] — update a timesheet */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const timesheet = await TimesheetService.update(id, {
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      notes: body.notes,
      status: body.status,
      totalHours: body.totalHours,
      billableHours: body.billableHours,
    });
    return NextResponse.json({ timesheet });
  } catch (e) {
    console.error('[timesheets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_timesheet' }, { status: 500 });
  }
}

/** DELETE /api/timesheets/[id] — delete a timesheet */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await TimesheetService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[timesheets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_timesheet' }, { status: 500 });
  }
}
