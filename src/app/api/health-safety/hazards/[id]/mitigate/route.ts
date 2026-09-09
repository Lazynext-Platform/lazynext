import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** POST /api/health-safety/hazards/[id]/mitigate — mitigate a hazard */
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
  const mitigation = String(body.mitigation || '').trim();
  if (!mitigation) {
    return NextResponse.json({ error: 'mitigation_required' }, { status: 400 });
  }

  try {
    const hazard = await HealthSafetyService.mitigateHazard(id, mitigation, session.user.id);
    if (!hazard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ hazard });
  } catch (e) {
    console.error('[health-safety/hazards/mitigate] error:', e);
    return NextResponse.json({ error: 'failed_to_mitigate_hazard' }, { status: 500 });
  }
}
