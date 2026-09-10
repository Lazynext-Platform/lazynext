import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalDonations: 0, activeSponsorships: 0, activeGrants: 0, activePrograms: 0, totalVolunteerHours: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await CorporateGivingService.getCorporateGivingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
