import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const initiative = await DeiService.getInitiative(id);
  if (!initiative) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ initiative });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const initiative = await DeiService.updateInitiative(id, {
      name: body.name, type: body.type, description: body.description, owner: body.owner,
      startDate: body.startDate, endDate: body.endDate, budget: body.budget,
      status: body.status, objectives: body.objectives, targetGroups: body.targetGroups, metrics: body.metrics,
    });
    if (!initiative) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ initiative });
  } catch (e) {
    console.error('[dei/initiatives] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_initiative' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DeiService.deleteInitiative(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
