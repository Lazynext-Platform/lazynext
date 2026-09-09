import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** POST /api/stakeholders/engagements/[id]/complete — complete an engagement */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const outcome = String(body.outcome || '').trim();
  if (!outcome) {
    return NextResponse.json({ error: 'outcome_required' }, { status: 400 });
  }

  try {
    const engagement = await StakeholderService.completeEngagement(id, outcome, session.user.id);
    if (!engagement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ engagement });
  } catch (e) {
    console.error('[stakeholders/engagements/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_engagement' }, { status: 500 });
  }
}
