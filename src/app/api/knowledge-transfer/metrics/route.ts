import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { publishedArticles: 0, activeMentorships: 0, scheduledSessions: 0, activePlans: 0, completionRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await KnowledgeTransferService.getKnowledgeTransferMetrics(organizationId);
  return NextResponse.json({ metrics });
}
