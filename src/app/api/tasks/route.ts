import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * Internal task CRUD API (session-auth).
 * POST /api/tasks — create a task in a project.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { projectId?: string; title?: string; description?: string; priority?: string; dueDate?: string };
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
        title,
        description: body.description?.trim() || null,
        priority,
        status: 'todo',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_create_task' },
      { status: 500 },
    );
  }
}
