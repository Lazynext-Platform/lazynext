import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';

/** GET /api/itsm/incidents/by-priority?priority=urgent — list incidents by priority */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ incidents: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const priority = url.searchParams.get('priority') || 'medium';
  const incidents = await ITSMService.getByPriority(organizationId, priority);
  return NextResponse.json({ incidents });
}
