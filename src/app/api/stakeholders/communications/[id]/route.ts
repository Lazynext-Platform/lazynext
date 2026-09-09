import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/communications/[id] — get a single communication */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const communication = await StakeholderService.getCommunication(id);
  if (!communication) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ communication });
}

/** PATCH /api/stakeholders/communications/[id] — update a communication */
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
    const communication = await StakeholderService.updateCommunication(id, {
      channel: body.channel, subject: body.subject, content: body.content, date: body.date,
      sentBy: body.sentBy, status: body.status, response: body.response, responseDate: body.responseDate,
    });
    if (!communication) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ communication });
  } catch (e) {
    console.error('[stakeholders/communications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_communication' }, { status: 500 });
  }
}
