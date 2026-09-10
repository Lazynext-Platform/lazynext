import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { planCount: 0, activePlanCount: 0, candidateCount: 0, readyCandidateCount: 0, readyNowCandidateCount: 0, trackCount: 0, inProgressTrackCount: 0, reviewCount: 0, overdueReviewCount: 0, byPlanType: {}, byPlanStatus: {}, byCandidateType: {}, byCandidateStatus: {}, byCandidateRank: {}, byTrackType: {}, byTrackStatus: {}, byReviewType: {}, byReviewStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await ManagementSuccessionService.getManagementSuccessionStats(organizationId);
  return NextResponse.json({ stats });
}
