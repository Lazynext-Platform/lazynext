import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/stats — get government relations stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { contactCount: 0, policyCount: 0, lobbyingCount: 0, complianceCount: 0, byContactType: {}, byContactLevel: {}, byPolicyStatus: {}, byLobbyingStatus: {}, byComplianceStatus: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await GovRelationsService.getGovRelationsStats(organizationId);
  return NextResponse.json({ stats });
}
