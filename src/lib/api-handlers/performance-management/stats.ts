import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { reviewCount: 0, goalCount: 0, feedbackCount: 0, planCount: 0, byReviewType: {}, byReviewStatus: {}, byReviewRating: {}, byGoalType: {}, byGoalStatus: {}, byFeedbackType: {}, byFeedbackStatus: {}, byPlanType: {}, byPlanStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PerformanceManagementService.getPerformanceManagementStats(organizationId);
  return NextResponse.json({ stats });
}
