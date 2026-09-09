import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { journeyCount: 0, activeJourneyCount: 0, stageCount: 0, touchpointCount: 0, activeTouchpointCount: 0, scoreCount: 0, analyzedScoreCount: 0, byJourneyStatus: {}, byStageType: {}, byTouchpointType: {}, byTouchpointStatus: {}, byScoreType: {}, byScoreStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await CustomerJourneyService.getCustomerJourneyStats(organizationId);
  return NextResponse.json({ stats });
}
