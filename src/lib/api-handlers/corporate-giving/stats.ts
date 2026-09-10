import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { donationCount: 0, sponsorshipCount: 0, grantCount: 0, programCount: 0, byDonationType: {}, byDonationStatus: {}, bySponsorshipType: {}, bySponsorshipStatus: {}, byGrantType: {}, byGrantStatus: {}, byProgramType: {}, byProgramStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await CorporateGivingService.getCorporateGivingStats(organizationId);
  return NextResponse.json({ stats });
}
