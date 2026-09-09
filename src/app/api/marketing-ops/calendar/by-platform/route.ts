import { NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar/by-platform — items grouped by platform */
export async function GET() {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const byPlatform = await ContentCalendarService.getByPlatform(resolved.organizationId);
  return NextResponse.json({ byPlatform });
}
