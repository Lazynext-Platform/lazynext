import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaskService } from '@/lib/services/task';

/**
 * GET /api/tasks/list — list tasks for the user's workspaces.
 * Query params: status, priority, planId
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const planId = searchParams.get('planId') || undefined;

    const workspaces = await WorkspaceService.listForUser(session.user.id);

    const tasksByWorkspace = await Promise.all(
      workspaces.map((w) =>
        TaskService.list(w.id, {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(planId ? { planId } : {}),
        }),
      ),
    );

    const tasks = tasksByWorkspace.flat();

    return NextResponse.json({ tasks });
  } catch (e) {
    console.error('[tasks/list] error:', e);
    return NextResponse.json({ error: 'failed_to_list_tasks' }, { status: 500 });
  }
}
