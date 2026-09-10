import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';
import { MarketingCampaignService } from '@/lib/services/marketing-campaign-service';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/stats — overall marketing operations stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;

  const [calendarStats, campaignStats, attributionStats] = await Promise.all([
    ContentCalendarService.getStats(organizationId),
    MarketingCampaignService.getStats(organizationId),
    LeadAttributionService.getStats(organizationId),
  ]);

  return NextResponse.json({
    calendar: calendarStats,
    campaigns: campaignStats,
    attribution: attributionStats,
  });
}
