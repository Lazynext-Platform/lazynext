import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const goal = await DeiService.getGoal(id);
  if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const goal = await DeiService.updateGoal(id, {
      type: body.type, title: body.title, description: body.description,
      targetValue: body.targetValue, unit: body.unit, deadline: body.deadline,
      status: body.status, initiativeId: body.initiativeId, owner: body.owner,
    });
    if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (e) {
    console.error('[dei/goals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_goal' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await DeiService.deleteGoal(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
