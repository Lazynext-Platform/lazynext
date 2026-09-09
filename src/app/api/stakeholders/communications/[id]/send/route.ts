import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** POST /api/stakeholders/communications/[id]/send — send a communication */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const communication = await StakeholderService.sendCommunication(id, session.user.id);
    if (!communication) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ communication });
  } catch (e) {
    console.error('[stakeholders/communications/send] error:', e);
    return NextResponse.json({ error: 'failed_to_send_communication' }, { status: 500 });
  }
}
