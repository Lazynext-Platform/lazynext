import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/stats — get customer success stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: null });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await CustomerSuccessService.getStats(organizationId);
  return NextResponse.json({ stats });
}
