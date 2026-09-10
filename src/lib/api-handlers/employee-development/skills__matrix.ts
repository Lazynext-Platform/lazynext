import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/skills/matrix — skills matrix */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ matrix: { skills: [], bySkill: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const matrix = await EmployeeDevelopmentService.getSkillsMatrix(organizationId);
  return NextResponse.json({ matrix });
}
