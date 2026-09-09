import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OpportunityService } from '@/lib/services/opportunity-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: {"detectedOpportunities":0,"approvedOpportunities":0,"pursuingOpportunities":0,"realizedOpportunities":0,"activeRules":0} });
  const organizationId = workspaces[0].organizationId;
  const metrics = await OpportunityService.getOpportunityDetectionMetrics(organizationId);
  return NextResponse.json({ metrics });
}
