import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints/velocity — get velocity across completed sprints */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ velocity: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const velocity = await SprintService.getVelocity(organizationId, {
    projectId: sp.get('projectId') || undefined,
  });
  return NextResponse.json({ velocity });
}
