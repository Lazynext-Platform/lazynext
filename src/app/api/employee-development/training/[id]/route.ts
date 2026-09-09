import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/training/[id] — get a single training plan */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const plan = await EmployeeDevelopmentService.getTrainingPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

/** PATCH /api/employee-development/training/[id] — update a training plan */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const plan = await EmployeeDevelopmentService.updateTrainingPlan(id, {
      title: body.title,
      description: body.description,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      progress: body.progress,
      trainer: body.trainer,
    });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[employee-development/training] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_training_plan' }, { status: 500 });
  }
}

/** DELETE /api/employee-development/training/[id] — delete a training plan */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await EmployeeDevelopmentService.deleteTrainingPlan(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[employee-development/training] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_training_plan' }, { status: 500 });
  }
}
