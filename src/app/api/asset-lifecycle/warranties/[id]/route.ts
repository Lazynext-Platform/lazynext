import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetWarrantyService } from '@/lib/services/asset-warranty-service';

/** GET /api/asset-lifecycle/warranties/[id] — get a single warranty */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const warranty = await AssetWarrantyService.get(id);
  if (!warranty) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ warranty });
}

/** PATCH /api/asset-lifecycle/warranties/[id] — update a warranty */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const warranty = await AssetWarrantyService.update(id, {
      type: body.type,
      provider: body.provider,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      coverage: body.coverage,
      terms: body.terms,
      status: body.status,
    });
    return NextResponse.json({ warranty });
  } catch (e) {
    console.error('[asset-lifecycle/warranties] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_warranty' }, { status: 500 });
  }
}

/** DELETE /api/asset-lifecycle/warranties/[id] — delete a warranty */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await AssetWarrantyService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[asset-lifecycle/warranties] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_warranty' }, { status: 500 });
  }
}
