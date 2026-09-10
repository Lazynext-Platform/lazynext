import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {"recommendationCount":0,"feedbackCount":0,"actionCount":0,"modelCount":0,"byRecommendationType":{},"byRecommendationStatus":{},"byFeedbackType":{},"byFeedbackStatus":{},"byActionType":{},"byActionStatus":{},"byModelType":{},"byModelStatus":{}} });
  const organizationId = workspaces[0].organizationId;
  const stats = await RecommendationService.getRecommendationEngineStats(organizationId);
  return NextResponse.json({ stats });
}
