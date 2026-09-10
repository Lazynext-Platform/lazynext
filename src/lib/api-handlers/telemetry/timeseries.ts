import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TelemetryService } from '@/lib/services/telemetry';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/telemetry/timeseries — get time-series buckets for a metric.
 * Query params: metricName, startTime, endTime, interval (1m|5m|1h|1d)
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
  const startTimeStr = sp.get('startTime');
  const endTimeStr = sp.get('endTime');
  const interval = sp.get('interval') as '1m' | '5m' | '1h' | '1d' | null;
  if (!startTimeStr || !endTimeStr || !interval) {
    return NextResponse.json({ error: 'startTime_endTime_interval_required' }, { status: 400 });
  }
  if (!['1m', '5m', '1h', '1d'].includes(interval)) {
    return NextResponse.json({ error: 'invalid_interval' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ series: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const series = await TelemetryService.getTimeSeries(organizationId, metricName, {
      startTime: new Date(startTimeStr),
      endTime: new Date(endTimeStr),
      interval,
    });
    return NextResponse.json({ series });
  } catch (e) {
    console.error('[telemetry] timeseries error:', e);
    return NextResponse.json({ error: 'failed_to_get_timeseries' }, { status: 500 });
  }
}
