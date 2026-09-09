import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar/stats — calendar stats */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const stats = await ContentCalendarService.getStats(resolved.organizationId);
  return NextResponse.json({ stats });
}
