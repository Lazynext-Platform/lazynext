import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/allocations — list resource allocations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ allocations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { status?: string; userId?: string; projectId?: string } = {};
  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('userId');
  const projectId = url.searchParams.get('projectId');
  if (status) filters.status = status;
  if (userId) filters.userId = userId;
  if (projectId) filters.projectId = projectId;

  const allocations = await CapacityService.list(organizationId, filters);
  return NextResponse.json({ allocations });
}

/** POST /api/capacity/allocations — create a resource allocation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  const startDate = body.startDate ? new Date(body.startDate) : null;
  if (!userId || !startDate) {
    return NextResponse.json({ error: 'userId_and_startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const allocation = await CapacityService.create({
      organizationId,
      workspaceId: body.workspaceId || undefined,
      userId,
      projectId: body.projectId,
      role: body.role,
      allocatedHours: body.allocatedHours,
      maxHours: body.maxHours,
      startDate,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      notes: body.notes,
    });
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (e) {
    console.error('[capacity/allocations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_allocation' }, { status: 500 });
  }
}
