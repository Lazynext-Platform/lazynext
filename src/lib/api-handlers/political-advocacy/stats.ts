import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { campaignCount: 0, activeCampaignCount: 0, lobbyingCount: 0, activeLobbyingCount: 0, positionCount: 0, publishedPositionCount: 0, contributionCount: 0, pendingContributionCount: 0, byCampaignType: {}, byCampaignStatus: {}, byLobbyingType: {}, byLobbyingStatus: {}, byPositionType: {}, byPositionStatus: {}, byContributionType: {}, byContributionStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PoliticalAdvocacyService.getPoliticalAdvocacyStats(organizationId);
  return NextResponse.json({ stats });
}
