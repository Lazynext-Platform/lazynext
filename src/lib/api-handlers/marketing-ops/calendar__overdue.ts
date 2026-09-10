import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar/overdue — overdue items */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const items = await ContentCalendarService.getOverdue(resolved.organizationId);
  return NextResponse.json({ items });
}
