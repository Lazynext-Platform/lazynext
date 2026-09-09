import { NextRequest, NextResponse } from 'next/server';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';
import type { ContentStatus } from '@/lib/services/content-calendar-service';

/** POST /api/marketing-ops/calendar/[id]/status — change status of a calendar item */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }
  const item = await ContentCalendarService.changeStatus(id, body.status as ContentStatus);
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ item });
}
