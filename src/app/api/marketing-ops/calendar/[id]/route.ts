import { NextRequest, NextResponse } from 'next/server';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar/[id] — get a calendar item by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await ContentCalendarService.get(id);
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ item });
}

/** PATCH /api/marketing-ops/calendar/[id] — update a calendar item */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const item = await ContentCalendarService.update(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      platform: body.platform,
      scheduledDate: body.scheduledDate,
      owner: body.owner,
      tags: body.tags,
      content: body.content,
    });
    if (!item) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[marketing-ops/calendar] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_calendar_item' }, { status: 500 });
  }
}

/** DELETE /api/marketing-ops/calendar/[id] — delete a calendar item */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await ContentCalendarService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
