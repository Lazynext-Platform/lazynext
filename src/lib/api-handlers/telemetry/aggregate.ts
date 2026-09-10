import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TelemetryService } from '@/lib/services/telemetry';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/telemetry/aggregate — aggregate telemetry for a metric.
 * Query params: metricName, startTime, endTime, interval
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const metricName = sp.get('metricName');
  if (!metricName) {
    return NextResponse.json({ error: 'metricName_required' }, { status: 400 });
  }
  const startTime = sp.get('startTime') ? new Date(sp.get('startTime')!) : undefined;
  const endTime = sp.get('endTime') ? new Date(sp.get('endTime')!) : undefined;
  const interval = sp.get('interval') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ aggregate: { count: 0, min: 0, max: 0, avg: 0, sum: 0, p50: 0, p90: 0, p99: 0, lastValue: 0 } });
    }
    const organizationId = workspaces[0].organizationId;

    const aggregate = await TelemetryService.aggregatePoints(organizationId, metricName, {
      startTime,
      endTime,
      interval,
    });
    return NextResponse.json({ aggregate });
  } catch (e) {
    console.error('[telemetry] aggregate error:', e);
    return NextResponse.json({ error: 'failed_to_aggregate_telemetry' }, { status: 500 });
  }
}
