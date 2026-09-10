import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** POST /api/itsm/incidents/[id]/status — change incident status */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const incident = await ITSMService.changeIncidentStatus(id, status);
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[itsm/incidents/status] error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
