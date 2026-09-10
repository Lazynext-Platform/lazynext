import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** GET /api/timesheets — list timesheets */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ timesheets: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { userId?: string; status?: string; dateStart?: Date; dateEnd?: Date } = {};
  const userId = url.searchParams.get('userId');
  const status = url.searchParams.get('status');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (userId) opts.userId = userId;
  if (status) opts.status = status;
  if (dateStart) opts.dateStart = new Date(dateStart);
  if (dateEnd) opts.dateEnd = new Date(dateEnd);

  const timesheets = await TimesheetService.list(organizationId, opts);
  return NextResponse.json({ timesheets });
}

/** POST /api/timesheets — create a timesheet */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const periodStart = body.periodStart ? new Date(body.periodStart) : null;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : null;
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'period_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const timesheet = await TimesheetService.create(organizationId, {
      userId: body.userId || session.user.id,
      periodStart,
      periodEnd,
      workspaceId: body.workspaceId,
      notes: body.notes,
    });
    return NextResponse.json({ timesheet }, { status: 201 });
  } catch (e) {
    console.error('[timesheets] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_timesheet' }, { status: 500 });
  }
}
