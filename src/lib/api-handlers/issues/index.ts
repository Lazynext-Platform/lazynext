import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IssueService } from '@/lib/services/issue-service';

/** GET /api/issues — list issues for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ issues: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const issues = await IssueService.list(organizationId, {
    type: (sp.get('type') as 'bug' | 'feature' | 'task' | 'enhancement' | 'epic') || undefined,
    priority: (sp.get('priority') as 'low' | 'medium' | 'high' | 'urgent' | 'critical') || undefined,
    severity: (sp.get('severity') as 'trivial' | 'minor' | 'major' | 'critical' | 'blocker') || undefined,
    status: (sp.get('status') as 'open' | 'in_progress' | 'in_review' | 'done' | 'closed') || undefined,
    assigneeId: sp.get('assigneeId') || undefined,
    projectId: sp.get('projectId') || undefined,
    sprintId: sp.get('sprintId') || undefined,
    labels: sp.get('labels') ? sp.get('labels')!.split(',') : undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ issues });
}

/** POST /api/issues — create a new issue */
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
  if (!body.type) {
    return NextResponse.json({ error: 'type_required' }, { status: 400 });
  }
  if (!body.priority) {
    return NextResponse.json({ error: 'priority_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const issue = await IssueService.create(organizationId, {
      title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      severity: body.severity,
      status: body.status,
      assigneeId: body.assigneeId,
      reporterId: body.reporterId ?? session.user.id,
      projectId: body.projectId,
      sprintId: body.sprintId,
      labels: Array.isArray(body.labels) ? body.labels : undefined,
      estimatedHours: body.estimatedHours,
      dueDate: body.dueDate,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (e) {
    console.error('[issues] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_issue' }, { status: 500 });
  }
}
