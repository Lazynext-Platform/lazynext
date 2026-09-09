import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/valuations/[id] — get a single valuation */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const valuation = await MAService.getValuation(id);
  if (!valuation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ valuation });
}

/** PATCH /api/ma/valuations/[id] — update a valuation */
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
    const valuation = await MAService.updateValuation(id, {
      method: body.method, value: body.value, rangeLow: body.rangeLow, rangeHigh: body.rangeHigh,
      assumptions: body.assumptions, multiples: body.multiples, date: body.date, analyst: body.analyst,
    });
    if (!valuation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ valuation });
  } catch (e) {
    console.error('[ma/valuations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_valuation' }, { status: 500 });
  }
}

/** DELETE /api/ma/valuations/[id] — delete a valuation */
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
    const ok = await MAService.deleteValuation(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ma/valuations] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_valuation' }, { status: 500 });
  }
}
