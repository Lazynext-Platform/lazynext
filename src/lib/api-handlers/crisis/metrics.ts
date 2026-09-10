import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeIncidents: 0, plansCoverage: 0, drillReadiness: 0, responseTime: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await CrisisService.getCrisisMetrics(organizationId);
  return NextResponse.json({ metrics });
}
