import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { RFQService } from '@/lib/services/rfq-service';
import type { RFQStatus } from '@/lib/services/rfq-service';

/** GET /api/procurement-v2/rfqs — list RFQs */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const sp = req.nextUrl.searchParams;

  const rfqs = await RFQService.list(resolved.organizationId, {
    status: (sp.get('status') as RFQStatus) || undefined,
    startDate: sp.get('startDate') || undefined,
    endDate: sp.get('endDate') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ rfqs });
}

/** POST /api/procurement-v2/rfqs — create an RFQ */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  try {
    const rfq = await RFQService.create(organizationId, {
      title,
      description: body.description,
      items: body.items,
      dueDate: body.dueDate,
      workspaceId: body.workspaceId,
      createdBy: userId,
    });
    return NextResponse.json({ rfq }, { status: 201 });
  } catch (e) {
    console.error('[procurement-v2/rfqs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_rfq' }, { status: 500 });
  }
}
