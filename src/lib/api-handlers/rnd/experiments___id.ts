import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const experiment = await RndService.getExperiment(id);
  if (!experiment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ experiment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const experiment = await RndService.updateExperiment(id, body);
    if (!experiment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ experiment });
  } catch (e) {
    console.error('[rnd/experiments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_experiment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RndService.deleteExperiment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
