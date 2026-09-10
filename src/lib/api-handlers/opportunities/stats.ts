import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OpportunityService } from '@/lib/services/opportunity-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {"opportunityCount":0,"ruleCount":0,"scoreCount":0,"actionCount":0,"byOpportunityType":{},"byOpportunityStatus":{},"byRuleType":{},"byRuleStatus":{},"byScoreType":{},"byScoreStatus":{},"byActionType":{},"byActionStatus":{}} });
  const organizationId = workspaces[0].organizationId;
  const stats = await OpportunityService.getOpportunityDetectionStats(organizationId);
  return NextResponse.json({ stats });
}
