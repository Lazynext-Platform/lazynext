import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeReviews: 0, completedReviews: 0, activeGoals: 0, achievedGoals: 0, pendingFeedback: 0, activePlans: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PerformanceManagementService.getPerformanceManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
