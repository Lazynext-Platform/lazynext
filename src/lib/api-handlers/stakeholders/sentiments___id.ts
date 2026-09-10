import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/sentiments/[id] — get a single sentiment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sentiment = await StakeholderService.getSentiment(id);
  if (!sentiment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ sentiment });
}

/** PATCH /api/stakeholders/sentiments/[id] — update a sentiment */
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
    const sentiment = await StakeholderService.updateSentiment(id, {
      sentiment: body.sentiment, score: body.score, date: body.date,
      reason: body.reason, trend: body.trend, recordedBy: body.recordedBy,
    });
    if (!sentiment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ sentiment });
  } catch (e) {
    console.error('[stakeholders/sentiments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_sentiment' }, { status: 500 });
  }
}

/** DELETE /api/stakeholders/sentiments/[id] — delete a sentiment */
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
    const ok = await StakeholderService.deleteSentiment(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[stakeholders/sentiments] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_sentiment' }, { status: 500 });
  }
}
