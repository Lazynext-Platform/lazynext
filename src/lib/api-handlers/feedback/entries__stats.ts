import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FeedbackService } from '@/lib/services/feedback-service';

/** GET /api/feedback/entries/stats — get feedback stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, bySource: {}, byCategory: {}, avgRating: 0, sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 } } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await FeedbackService.getStats(organizationId);
  return NextResponse.json({ stats });
}
