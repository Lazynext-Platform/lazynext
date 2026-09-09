import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: {"generatedRecommendations":0,"acceptedRecommendations":0,"actedRecommendations":0,"activeModels":0,"avgConfidence":0} });
  const organizationId = workspaces[0].organizationId;
  const metrics = await RecommendationService.getRecommendationEngineMetrics(organizationId);
  return NextResponse.json({ metrics });
}
