import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/stats — hiring stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalJobs: 0, jobsByStatus: {}, totalCandidates: 0, candidatesByStatus: {}, totalInterviews: 0, totalOffers: 0, offersByStatus: {}, acceptanceRate: 0, avgTimeToHire: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await RecruitmentService.getHiringStats(organizationId);
  return NextResponse.json({ stats });
}
