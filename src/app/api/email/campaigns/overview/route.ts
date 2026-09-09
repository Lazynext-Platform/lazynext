import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailCampaignService } from '@/lib/services/email-campaign-service';

/** GET /api/email/campaigns/overview — get campaign overview stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ overview: { total: 0, byStatus: {}, totalSent: 0, totalDelivered: 0, totalOpens: 0, totalClicks: 0, totalBounces: 0, totalUnsubscribes: 0, avgOpenRate: 0, avgClickRate: 0 } });
  }

  const overview = await EmailCampaignService.getOverview(workspaces[0].id);
  return NextResponse.json({ overview });
}
