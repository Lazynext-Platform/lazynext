import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** GET /api/health-safety/trainings/[id] — get a single training */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const training = await HealthSafetyService.getTraining(id);
  if (!training) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ training });
}

/** PATCH /api/health-safety/trainings/[id] — update a training */
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
    const training = await HealthSafetyService.updateTraining(id, {
      name: body.name, description: body.description, category: body.category,
      requiredFor: body.requiredFor, durationHours: body.durationHours,
      frequencyMonths: body.frequencyMonths, provider: body.provider,
      certification: body.certification, status: body.status,
    });
    if (!training) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ training });
  } catch (e) {
    console.error('[health-safety/trainings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_training' }, { status: 500 });
  }
}

/** DELETE /api/health-safety/trainings/[id] — delete a training */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await HealthSafetyService.deleteTraining(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[health-safety/trainings] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_training' }, { status: 500 });
  }
}
