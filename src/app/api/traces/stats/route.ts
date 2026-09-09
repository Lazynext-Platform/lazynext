import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TraceService } from '@/lib/services/trace-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/traces/stats — get trace statistics.
 * Query params: status, startTime, endTime, limit
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const startTime = sp.get('startTime') ? new Date(sp.get('startTime')!) : undefined;
  const endTime = sp.get('endTime') ? new Date(sp.get('endTime')!) : undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({
        stats: {
          total: 0,
          avgDurationMs: 0,
          errorRate: 0,
          errorCount: 0,
          slowTraces: 0,
          slowThresholdMs: 1000,
        },
      });
    }
    const organizationId = workspaces[0].organizationId;

    const stats = await TraceService.getTraceStats(organizationId, { status, startTime, endTime, limit });
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[traces] stats error:', e);
    return NextResponse.json({ error: 'failed_to_get_trace_stats' }, { status: 500 });
  }
}
