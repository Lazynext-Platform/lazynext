import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService, type AnalyticsQuery } from '@/lib/services/analytics-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/analytics/query — run a raw analytics query.
 * Body: { organizationId, query: AnalyticsQuery, workspaceId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    query?: AnalyticsQuery;
    workspaceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  if (!body.query || !body.query.dataSource) {
    return NextResponse.json({ error: 'query_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const result = await AnalyticsService.getQueryResults(organizationId, body.query, {
      workspaceId: body.workspaceId?.trim() || undefined,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[analytics/query] error:', e);
    return NextResponse.json({ error: 'failed_to_run_query' }, { status: 500 });
  }
}
