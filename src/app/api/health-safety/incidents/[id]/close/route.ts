import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** POST /api/health-safety/incidents/[id]/close — close an incident */
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
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const incident = await HealthSafetyService.closeIncident(id, resolution, session.user.id);
    if (!incident) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ incident });
  } catch (e) {
    console.error('[health-safety/incidents/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_incident' }, { status: 500 });
  }
}
