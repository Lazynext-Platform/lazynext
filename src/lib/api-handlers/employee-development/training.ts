import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/training — list training plans */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ plans: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { employeeId?: string; status?: string } = {};
  const employeeId = url.searchParams.get('employeeId');
  const status = url.searchParams.get('status');
  if (employeeId) opts.employeeId = employeeId;
  if (status) opts.status = status;

  const plans = await EmployeeDevelopmentService.listTrainingPlans(organizationId, opts);
  return NextResponse.json({ plans });
}

/** POST /api/employee-development/training — create a training plan */
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
  if (!body.startDate) {
    return NextResponse.json({ error: 'startDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const plan = await EmployeeDevelopmentService.createTrainingPlan(organizationId, {
      employeeId,
      title,
      description: body.description,
      status: body.status,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      progress: body.progress,
      trainer: body.trainer,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/training] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_training_plan' }, { status: 500 });
  }
}
