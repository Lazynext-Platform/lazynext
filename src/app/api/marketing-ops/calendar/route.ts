import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { ContentCalendarService } from '@/lib/services/content-calendar-service';
import type { ContentItemType, ContentPlatform, ContentStatus } from '@/lib/services/content-calendar-service';

/** GET /api/marketing-ops/calendar — list content calendar items */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;

  const items = await ContentCalendarService.list(resolved.organizationId, {
    type: (sp.get('type') as ContentItemType) || undefined,
    platform: (sp.get('platform') as ContentPlatform) || undefined,
    status: (sp.get('status') as ContentStatus) || undefined,
    owner: sp.get('owner') || undefined,
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ items });
}

/** POST /api/marketing-ops/calendar — create a content calendar item */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!body.type || !body.scheduledDate) {
    return NextResponse.json({ error: 'type_and_scheduled_date_required' }, { status: 400 });
  }

  try {
    const item = await ContentCalendarService.create(organizationId, {
      title,
      description: body.description,
      type: body.type,
      platform: body.platform,
      scheduledDate: body.scheduledDate,
      status: body.status,
      owner: body.owner,
      tags: body.tags,
      content: body.content,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[marketing-ops/calendar] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_calendar_item' }, { status: 500 });
  }
}
