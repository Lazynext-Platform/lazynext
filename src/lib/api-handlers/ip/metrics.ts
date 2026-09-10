import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/metrics — get IP metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { portfolioValue: 0, activeLicenses: 0, royaltyIncome: 0, pendingDisputes: 0, expiringIP: 0, byType: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await IPService.getIPMetrics(organizationId);
  return NextResponse.json({ metrics });
}
