import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisService } from '@/lib/services/crisis-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const drill = await CrisisService.getDrill(id);
  if (!drill) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ drill });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const drill = await CrisisService.updateDrill(id, {
      planId: body.planId, name: body.name, type: body.type, scheduledDate: body.scheduledDate,
      duration: body.duration, participants: body.participants, objectives: body.objectives,
      status: body.status, notes: body.notes,
    });
    if (!drill) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ drill });
  } catch (e) {
    console.error('[crisis/drills] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_drill' }, { status: 500 });
  }
}
