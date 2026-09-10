import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TimesheetService } from '@/lib/services/timesheet-service';

/** GET /api/timesheets/stats — timesheet stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byStatus: {}, totalHours: 0, billableHours: 0, avgHoursPerTimesheet: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { userId?: string; dateStart?: Date; dateEnd?: Date } = {};
  const userId = url.searchParams.get('userId');
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (userId) opts.userId = userId;
  if (dateStart) opts.dateStart = new Date(dateStart);
  if (dateEnd) opts.dateEnd = new Date(dateEnd);

  const stats = await TimesheetService.getStats(organizationId, opts);
  return NextResponse.json({ stats });
}
