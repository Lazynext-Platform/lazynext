import { NextRequest, NextResponse } from 'next/server';
import { RFQService } from '@/lib/services/rfq-service';

/** GET /api/procurement-v2/rfqs/[id] — get an RFQ by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const rfq = await RFQService.get(id);
  if (!rfq) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ rfq });
}

/** PATCH /api/procurement-v2/rfqs/[id] — update an RFQ */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const rfq = await RFQService.update(id, {
      title: body.title,
      description: body.description,
      items: body.items,
      dueDate: body.dueDate,
    });
    if (!rfq) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ rfq });
  } catch (e) {
    console.error('[procurement-v2/rfqs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_rfq' }, { status: 500 });
  }
}

/** DELETE /api/procurement-v2/rfqs/[id] — delete an RFQ */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await RFQService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
