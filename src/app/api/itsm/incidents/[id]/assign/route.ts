import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ITSMService } from '@/lib/services/itsm-service';

/** POST /api/itsm/incidents/[id]/assign — assign an incident to a user */
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
  const assignedToId = String(body.assignedToId || '').trim();
  if (!assignedToId) {
    return NextResponse.json({ error: 'assigned_to_required' }, { status: 400 });
  }

  try {
    const incident = await ITSMService.assignIncident(id, assignedToId);
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[itsm/incidents/assign] error:', e);
    return NextResponse.json({ error: 'failed_to_assign_incident' }, { status: 500 });
  }
}
