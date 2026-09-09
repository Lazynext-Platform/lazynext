import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** GET /api/employee-development/onboarding/tasks — list onboarding tasks */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { employeeId?: string; category?: string; status?: string } = {};
  const employeeId = url.searchParams.get('employeeId');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  if (employeeId) opts.employeeId = employeeId;
  if (category) opts.category = category;
  if (status) opts.status = status;

  const tasks = await OnboardingService.listTasks(organizationId, opts);
  return NextResponse.json({ tasks });
}

/** POST /api/employee-development/onboarding/tasks — create an onboarding task */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  if (!title || !employeeId) {
    return NextResponse.json({ error: 'title_and_employeeId_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const task = await OnboardingService.createTask(organizationId, {
      employeeId,
      title,
      description: body.description,
      category: body.category,
      status: body.status,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      assignedTo: body.assignedTo,
      order: body.order,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/onboarding/tasks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_task' }, { status: 500 });
  }
}
