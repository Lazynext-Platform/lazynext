import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TimeOffService } from '@/lib/services/time-off-service';

/** GET /api/hr/time-off — list time-off requests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ requests: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const { searchParams } = new URL(req.url);
  const filters: {
    employeeId?: string;
    status?: string;
    type?: string;
    dateRange?: { start?: Date; end?: Date };
  } = {};
  const employeeId = searchParams.get('employeeId') || undefined;
  const status = searchParams.get('status') || undefined;
  const type = searchParams.get('type') || undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (employeeId) filters.employeeId = employeeId;
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (startDate || endDate) {
    filters.dateRange = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    };
  }

  const requests = await TimeOffService.list(organizationId, filters);
  return NextResponse.json({ requests });
}

/** POST /api/hr/time-off — create a time-off request */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;
  if (!employeeId || !startDate || !endDate) {
    return NextResponse.json({ error: 'employee_and_dates_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const request = await TimeOffService.create({
      organizationId,
      employeeId,
      type: body.type,
      startDate,
      endDate,
      reason: body.reason,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[hr/time-off] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_request' }, { status: 500 });
  }
}
