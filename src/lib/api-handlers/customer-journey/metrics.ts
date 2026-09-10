import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeJourneys: 0, totalTouchpoints: 0, averageScore: 0, stagesCoverage: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await CustomerJourneyService.getCustomerJourneyMetrics(organizationId);
  return NextResponse.json({ metrics });
}
