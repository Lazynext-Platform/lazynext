import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/career-path/[employeeId] — get career path */
export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { employeeId } = params;
  const careerPath = await EmployeeDevelopmentService.getCareerPath(employeeId);
  if (!careerPath) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ careerPath });
}

/** POST /api/employee-development/career-path/[employeeId] — set career path */
export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { employeeId } = params;
  const body = await req.json().catch(() => ({}));
  const currentRole = String(body.currentRole || '').trim();
  const targetRole = String(body.targetRole || '').trim();
  if (!currentRole || !targetRole) {
    return NextResponse.json({ error: 'currentRole_and_targetRole_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const careerPath = await EmployeeDevelopmentService.setCareerPath(
      employeeId,
      ws.organizationId,
      ws.id,
      {
        currentRole,
        targetRole,
        timeline: String(body.timeline || ''),
        milestones: Array.isArray(body.milestones) ? body.milestones : [],
        developmentGoals: Array.isArray(body.developmentGoals) ? body.developmentGoals : [],
        mentorId: body.mentorId,
      },
      session.user.id,
    );
    return NextResponse.json({ careerPath }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/career-path] create error:', e);
    return NextResponse.json({ error: 'failed_to_set_career_path' }, { status: 500 });
  }
}
