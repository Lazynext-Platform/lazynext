import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MarketResearchService } from '@/lib/services/market-research-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { projectCount: 0, segmentCount: 0, competitorCount: 0, insightCount: 0, byProjectType: {}, byProjectStatus: {}, bySegmentType: {}, bySegmentStatus: {}, byCompetitorType: {}, byCompetitorStatus: {}, byInsightType: {}, byInsightStatus: {}, byInsightPriority: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await MarketResearchService.getMarketResearchStats(organizationId);
  return NextResponse.json({ stats });
}
