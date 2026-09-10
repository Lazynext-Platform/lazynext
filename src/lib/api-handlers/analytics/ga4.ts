import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getUserPlanTier } from '@/lib/plan-tier';
import {
  GA4Client,
  isPendingCredentials,
  type GA4DateRange,
  type GA4Metric,
} from '@/lib/analytics/ga4';

export const maxDuration = 60;

const VALID_METRICS: GA4Metric[] = ['overview', 'traffic', 'conversions', 'audience', 'realtime'];

/**
 * POST /api/analytics/ga4
 * Fetch GA4 analytics data for a property.
 *
 * Body: { propertyId: string, dateRange: { startDate, endDate }, metric: GA4Metric, dryRun?: boolean }
 *
 * Cost: 0 credits — this is an analytics API call, not an AI generation.
 * Plan-tier check is performed for access gating (analytics features are
 * available to all authenticated tiers in this implementation).
 *
 * Defaults to dry-run for safety; real mode without credentials returns a
 * structured `pending_credentials` response.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  // Plan-tier check (access gating). Analytics is available to all tiers,
  // but we still resolve the tier so future gating can be applied and so
  // the request is logged with the user's tier context.
  const planTier = await getUserPlanTier(uid).catch(() => 'free' as const);

  const body = await req.json().catch(() => ({}));
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim().slice(0, 128) : '';
  const metric = typeof body.metric === 'string' ? (body.metric as GA4Metric) : 'overview';
  const dateRange = body.dateRange as GA4DateRange | undefined;
  const dryRun = body.dryRun !== false; // default to dry-run for safety

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId_required' }, { status: 400 });
  }
  if (!VALID_METRICS.includes(metric)) {
    return NextResponse.json({ error: 'invalid_metric', validMetrics: VALID_METRICS }, { status: 400 });
  }

  // realtime does not require a date range; other metrics do.
  if (metric !== 'realtime') {
    if (
      !dateRange ||
      typeof dateRange.startDate !== 'string' ||
      typeof dateRange.endDate !== 'string' ||
      !dateRange.startDate ||
      !dateRange.endDate
    ) {
      return NextResponse.json({ error: 'dateRange_required' }, { status: 400 });
    }
  }

  const client = new GA4Client({ dryRun });

  try {
    let data;
    switch (metric) {
      case 'overview':
        data = await client.getOverview(propertyId, dateRange as GA4DateRange);
        break;
      case 'traffic':
        data = await client.getTrafficSources(propertyId, dateRange as GA4DateRange);
        break;
      case 'conversions':
        data = await client.getConversions(propertyId, dateRange as GA4DateRange);
        break;
      case 'audience':
        data = await client.getAudienceOverview(propertyId, dateRange as GA4DateRange);
        break;
      case 'realtime':
        data = await client.getRealtime(propertyId);
        break;
      default:
        return NextResponse.json({ error: 'invalid_metric' }, { status: 400 });
    }

    // Surface pending_credentials as a 200 with a status field so the UI
    // can render a "connect credentials" state without an error path.
    if (isPendingCredentials(data)) {
      return NextResponse.json({ data, planTier, dryRun });
    }

    return NextResponse.json({ data, planTier, dryRun, cost: 0 });
  } catch (e) {
    console.error('[analytics/ga4] error:', String(e));
    return NextResponse.json({ error: 'ga4_request_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
