import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { articleCount: 0, mentorshipCount: 0, sessionCount: 0, planCount: 0, byArticleType: {}, byArticleStatus: {}, byMentorshipStatus: {}, bySessionType: {}, bySessionStatus: {}, byPlanStatus: {}, byPlanPriority: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await KnowledgeTransferService.getKnowledgeTransferStats(organizationId);
  return NextResponse.json({ stats });
}
