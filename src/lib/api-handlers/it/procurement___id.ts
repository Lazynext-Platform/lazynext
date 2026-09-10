import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITProcurementService } from '@/lib/services/it-procurement-service';

/** GET /api/it/procurement/[id] — get a single procurement request */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const request = await ITProcurementService.get(id);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ request });
}

/** PATCH /api/it/procurement/[id] — update a procurement request */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const request = await ITProcurementService.update(id, {
      requestName: body.requestName,
      description: body.description,
      type: body.type,
      items: Array.isArray(body.items) ? body.items : undefined,
      currency: body.currency,
      vendorId: body.vendorId,
      status: body.status,
    });
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[it/procurement] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_procurement' }, { status: 500 });
  }
}

/** DELETE /api/it/procurement/[id] — delete a procurement request */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await ITProcurementService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[it/procurement] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_procurement' }, { status: 500 });
  }
}
