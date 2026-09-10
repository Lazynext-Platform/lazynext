import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const training = await DeiService.getTraining(id);
  if (!training) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ training });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const training = await DeiService.updateTraining(id, {
      title: body.title, description: body.description, facilitator: body.facilitator,
      audience: body.audience, format: body.format, duration: body.duration,
      scheduledDate: body.scheduledDate, status: body.status, materials: body.materials,
      completionRate: body.completionRate, notes: body.notes,
    });
    if (!training) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ training });
  } catch (e) {
    console.error('[dei/trainings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_training' }, { status: 500 });
  }
}
