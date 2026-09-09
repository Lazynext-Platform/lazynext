import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';

/** GET /api/itsm/incidents/by-status?status=open — list incidents by status */
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
  const status = url.searchParams.get('status') || 'open';
  const incidents = await ITSMService.getByStatus(organizationId, status);
  return NextResponse.json({ incidents });
}
