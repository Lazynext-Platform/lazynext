import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';

/** GET /api/itsm/incidents/sla-breaches — list SLA-breached incidents */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ incidents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const incidents = await ITSMService.getSLABreaches(organizationId);
  return NextResponse.json({ incidents });
}
