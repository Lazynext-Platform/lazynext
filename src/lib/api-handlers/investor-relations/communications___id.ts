import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/communications/[id] — get a single communication */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const communication = await InvestorRelationsService.getCommunication(id);
  if (!communication) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ communication });
}

/** PATCH /api/investor-relations/communications/[id] — update a communication */
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
    const communication = await InvestorRelationsService.updateCommunication(id, {
      type: body.type, subject: body.subject, date: body.date,
      summary: body.summary, outcome: body.outcome, followUp: body.followUp, status: body.status,
    });
    if (!communication) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ communication });
  } catch (e) {
    console.error('[investor-relations/communications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_communication' }, { status: 500 });
  }
}
