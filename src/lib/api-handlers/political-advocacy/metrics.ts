import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeCampaigns: 0, activeLobbying: 0, publishedPositions: 0, pendingContributions: 0, totalContributionAmount: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PoliticalAdvocacyService.getPoliticalAdvocacyMetrics(organizationId);
  return NextResponse.json({ metrics });
}
