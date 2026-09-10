import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StrategyService } from '@/lib/services/strategy-service';

/** PATCH /api/strategy/okrs/[id] — update an OKR */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const okr = await StrategyService.updateOkR(id, {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      keyResults: Array.isArray(body.keyResults) ? body.keyResults : undefined,
    });
    return NextResponse.json({ okr });
  } catch (e) {
    console.error('[strategy/okrs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_okr' }, { status: 500 });
  }
}

/** DELETE /api/strategy/okrs/[id] — delete an OKR */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    // Delete KPIs first, then the goal
    await StrategyService.updateOkR(id, { keyResults: [] });
    const { prisma } = await import('@/lib/prisma');
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[strategy/okrs] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_okr' }, { status: 500 });
  }
}
