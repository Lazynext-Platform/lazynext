import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/updates/[id] — get a single update */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const update = await InvestorRelationsService.getUpdate(id);
  if (!update) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ update });
}

/** PATCH /api/investor-relations/updates/[id] — update an update */
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
    const update = await InvestorRelationsService.updateUpdate(id, {
      title: body.title, period: body.period, content: body.content,
      metrics: body.metrics, highlights: body.highlights, challenges: body.challenges,
      financials: body.financials, status: body.status, sentTo: body.sentTo, date: body.date,
    });
    if (!update) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ update });
  } catch (e) {
    console.error('[investor-relations/updates] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_update' }, { status: 500 });
  }
}
