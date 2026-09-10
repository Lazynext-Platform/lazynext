import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** GET /api/employee-development/onboarding/tasks/[id] — get a single onboarding task */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const task = await OnboardingService.getTask(id);
  if (!task) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ task });
}

/** PATCH /api/employee-development/onboarding/tasks/[id] — update an onboarding task */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const task = await OnboardingService.updateTask(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      assignedTo: body.assignedTo,
      order: body.order,
    });
    return NextResponse.json({ task });
  } catch (e) {
    console.error('[employee-development/onboarding/tasks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_task' }, { status: 500 });
  }
}

/** DELETE /api/employee-development/onboarding/tasks/[id] — delete an onboarding task */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await OnboardingService.deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[employee-development/onboarding/tasks] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_task' }, { status: 500 });
  }
}
