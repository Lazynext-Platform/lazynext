import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/engagements/[id] — get a single engagement */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const engagement = await StakeholderService.getEngagement(id);
  if (!engagement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ engagement });
}

/** PATCH /api/stakeholders/engagements/[id] — update an engagement */
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
    const engagement = await StakeholderService.updateEngagement(id, {
      type: body.type, date: body.date, topic: body.topic, outcome: body.outcome,
      actionItems: body.actionItems, nextSteps: body.nextSteps,
      attendees: body.attendees, status: body.status,
    });
    if (!engagement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ engagement });
  } catch (e) {
    console.error('[stakeholders/engagements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_engagement' }, { status: 500 });
  }
}
