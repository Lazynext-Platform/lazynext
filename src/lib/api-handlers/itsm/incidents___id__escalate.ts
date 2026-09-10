import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** POST /api/itsm/incidents/[id]/escalate — escalate an incident (increase priority) */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const incident = await ITSMService.escalateIncident(id);
    return NextResponse.json({ incident });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_escalate';
    if (msg === 'incident_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[itsm/incidents/escalate] error:', e);
    return NextResponse.json({ error: 'failed_to_escalate' }, { status: 500 });
  }
}
