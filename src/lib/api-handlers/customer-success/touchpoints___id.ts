import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/touchpoints/[id] — get a single touchpoint */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const touchpoint = await CustomerSuccessService.getTouchpoint(id);
  if (!touchpoint) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ touchpoint });
}

/** PATCH /api/customer-success/touchpoints/[id] — update a touchpoint */
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
    const touchpoint = await CustomerSuccessService.updateTouchpoint(id, {
      type: body.type, date: body.date, participant: body.participant,
      summary: body.summary, outcome: body.outcome,
      actionItems: body.actionItems, nextSteps: body.nextSteps, sentiment: body.sentiment,
    });
    if (!touchpoint) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ touchpoint });
  } catch (e) {
    console.error('[customer-success/touchpoints] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_touchpoint' }, { status: 500 });
  }
}
