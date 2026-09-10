import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/innovation-metrics — get innovation metrics summary */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: null });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await InnovationService.getInnovationMetrics(organizationId);
  return NextResponse.json({ metrics });
}
