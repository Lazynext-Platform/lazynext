import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/due-diligence/[id] — get a single due diligence record */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const dd = await MAService.getDueDiligence(id);
  if (!dd) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ dueDiligence: dd });
}

/** PATCH /api/ma/due-diligence/[id] — update a due diligence record */
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
    const dd = await MAService.updateDueDiligence(id, {
      areas: body.areas, status: body.status, startDate: body.startDate, endDate: body.endDate,
    });
    if (!dd) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ dueDiligence: dd });
  } catch (e) {
    console.error('[ma/due-diligence] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_due_diligence' }, { status: 500 });
  }
}
