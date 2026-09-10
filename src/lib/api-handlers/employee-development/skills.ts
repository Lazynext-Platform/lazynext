import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** POST /api/employee-development/skills — add a skill to an employee */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const skillName = String(body.skillName || '').trim();
  if (!employeeId || !skillName) {
    return NextResponse.json({ error: 'employeeId_and_skillName_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const skill = await EmployeeDevelopmentService.addSkill(
      ws.organizationId,
      ws.id,
      {
        employeeId,
        skillName,
        proficiency: Number(body.proficiency ?? 1),
        certified: body.certified,
        yearsExperience: body.yearsExperience,
      },
      session.user.id,
    );
    return NextResponse.json({ skill }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/skills] create error:', e);
    return NextResponse.json({ error: 'failed_to_add_skill' }, { status: 500 });
  }
}
