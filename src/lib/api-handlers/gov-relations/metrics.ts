import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/metrics — get government relations metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { activePolicies: 0, registeredLobbying: 0, pendingCompliance: 0, totalContacts: 0, overdueCompliance: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await GovRelationsService.getGovRelationsMetrics(organizationId);
  return NextResponse.json({ metrics });
}
