import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';

/** GET /api/itsm/incidents — list incidents */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ incidents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const filters: { status?: string; priority?: string; category?: string; type?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (category) filters.category = category;
  if (type) filters.type = type;
  if (search) filters.search = search;

  const incidents = await ITSMService.list(organizationId, filters);
  return NextResponse.json({ incidents });
}

/** POST /api/itsm/incidents — create an incident */
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
    const incident = await ITSMService.create({
      organizationId,
      workspaceId: body.workspaceId || undefined,
      title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      status: body.status,
      severity: body.severity,
      category: body.category,
      assignedToId: body.assignedToId,
      reportedById: body.reportedById || session.user.id,
      affectedService: body.affectedService,
      slaDueAt: body.slaDueAt ? new Date(body.slaDueAt) : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ incident }, { status: 201 });
  } catch (e) {
    console.error('[itsm/incidents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_incident' }, { status: 500 });
  }
}
