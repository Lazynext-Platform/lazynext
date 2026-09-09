import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IssueService } from '@/lib/services/issue-service';

/** GET /api/issues/[id] — get an issue by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const issue = await IssueService.get(id);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}

/** PATCH /api/issues/[id] — update an issue */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const issue = await IssueService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      severity: body.severity,
      status: body.status,
      assigneeId: body.assigneeId,
      reporterId: body.reporterId,
      projectId: body.projectId,
      sprintId: body.sprintId,
      labels: body.labels,
      estimatedHours: body.estimatedHours,
      dueDate: body.dueDate,
    });
    if (!issue) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ issue });
  } catch (e) {
    console.error('[issues] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_issue' }, { status: 500 });
  }
}

/** DELETE /api/issues/[id] — delete an issue */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await IssueService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
