import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/hazards/[id] — get a single hazard */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const hazard = await HealthSafetyService.getHazard(id);
  if (!hazard) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ hazard });
}

/** PATCH /api/health-safety/hazards/[id] — update a hazard */
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
    const hazard = await HealthSafetyService.updateHazard(id, {
      title: body.title, description: body.description, category: body.category,
      location: body.location, riskLevel: body.riskLevel,
      identifiedBy: body.identifiedBy, identifiedDate: body.identifiedDate, status: body.status,
    });
    if (!hazard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ hazard });
  } catch (e) {
    console.error('[health-safety/hazards] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_hazard' }, { status: 500 });
  }
}
