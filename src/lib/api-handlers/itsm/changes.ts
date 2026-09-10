import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChangeManagementService } from '@/lib/services/change-management-service';

/** GET /api/itsm/changes — list change requests */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ changes: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { status?: string; type?: string; priority?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const priority = url.searchParams.get('priority');
  const search = url.searchParams.get('search');
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (priority) filters.priority = priority;
  if (search) filters.search = search;

  const changes = await ChangeManagementService.list(organizationId, filters);
  return NextResponse.json({ changes });
}

/** POST /api/itsm/changes — create a change request */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const change = await ChangeManagementService.create({
      organizationId,
      workspaceId: body.workspaceId || undefined,
      title,
      description: body.description,
      type: body.type,
      status: body.status,
      priority: body.priority,
      riskLevel: body.riskLevel,
      requestedById: body.requestedById || session.user.id,
      rollbackPlan: body.rollbackPlan,
      impactAnalysis: body.impactAnalysis,
      affectedSystems: Array.isArray(body.affectedSystems) ? body.affectedSystems : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
    return NextResponse.json({ change }, { status: 201 });
  } catch (e) {
    console.error('[itsm/changes] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_change' }, { status: 500 });
  }
}
