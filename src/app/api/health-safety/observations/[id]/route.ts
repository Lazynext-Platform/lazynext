import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/observations/[id] — get a single observation */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const observation = await HealthSafetyService.getObservation(id);
  if (!observation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ observation });
}

/** PATCH /api/health-safety/observations/[id] — update an observation */
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
    const observation = await HealthSafetyService.updateObservation(id, {
      observer: body.observer, date: body.date, location: body.location,
      behavior: body.behavior, description: body.description, category: body.category,
      feedback: body.feedback, status: body.status,
    });
    if (!observation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ observation });
  } catch (e) {
    console.error('[health-safety/observations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_observation' }, { status: 500 });
  }
}
