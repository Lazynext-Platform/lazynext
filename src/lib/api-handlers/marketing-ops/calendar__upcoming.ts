import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar/upcoming — upcoming scheduled items */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const days = Number(req.nextUrl.searchParams.get('days')) || 7;
  const items = await ContentCalendarService.getUpcoming(resolved.organizationId, days);
  return NextResponse.json({ items });
}
