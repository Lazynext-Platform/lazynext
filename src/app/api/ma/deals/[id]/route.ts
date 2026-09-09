import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/deals/[id] — get a single M&A deal */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deal = await MAService.getDeal(id);
  if (!deal) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deal });
}

/** PATCH /api/ma/deals/[id] — update an M&A deal */
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
    const deal = await MAService.updateDeal(id, {
      name: body.name, type: body.type, status: body.status,
      dealValue: body.dealValue, structure: body.structure,
      expectedCloseDate: body.expectedCloseDate, lead: body.lead, team: body.team,
    });
    if (!deal) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (e) {
    console.error('[ma/deals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_deal' }, { status: 500 });
  }
}
