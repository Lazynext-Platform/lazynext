import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

/**
 * Internal task CRUD API (session-auth).
 * POST /api/tasks — create a task in a project.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { projectId?: string; title?: string; description?: string; priority?: string; dueDate?: string; assigneeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const title = body.title?.trim();
  if (!projectId || !title) {
    return NextResponse.json({ error: 'projectId_and_title_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: { in: wsIds }, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const priority = body.priority && validPriorities.includes(body.priority) ? body.priority : 'medium';

    const task = await prisma.task.create({
      data: {
        projectId,
        title: title.slice(0, 200),
        description: body.description?.trim().slice(0, 2000) || null,
        priority,
        status: 'todo',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assigneeId: body.assigneeId?.trim() || null,
      },
    });

    // Notify the assignee if the task is assigned to someone other than the creator
    if (body.assigneeId && body.assigneeId !== session.user.id) {
      await createNotification({
        userId: body.assigneeId,
        workspaceId: project.workspaceId,
        type: 'task_assigned',
        title: `Task assigned: ${title}`,
        body: body.description?.trim() || undefined,
      }).catch(() => {}); // Don't fail the request if notification fails
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    console.error('[tasks] create error:', e);
    return NextResponse.json(
      { error: 'failed_to_create_task' },
      { status: 500 },
    );
  }
}
