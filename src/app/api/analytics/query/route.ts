import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService, type AnalyticsQuery } from '@/lib/services/analytics';
import { WorkspaceService } from '@/lib/services/workspace';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const query: AnalyticsQuery = body.query || body;
  if (!query.dataSource) return NextResponse.json({ error: 'missing_data_source' }, { status: 400 });

  try {
    const result = await AnalyticsService.getQueryResults(
      workspaces[0].organizationId,
      query,
      { workspaceId: workspaces[0].id },
    );
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[analytics/query] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
