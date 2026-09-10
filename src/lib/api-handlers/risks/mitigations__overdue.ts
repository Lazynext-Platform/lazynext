import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskMitigationService } from '@/lib/services/risk-mitigation-service';

/** GET /api/risks/mitigations/overdue — overdue mitigations */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ mitigations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const mitigations = await RiskMitigationService.getOverdue(organizationId);
  return NextResponse.json({ mitigations });
}
