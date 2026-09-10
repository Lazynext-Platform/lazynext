import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const executor = await EstatePlanningService.getExecutor(id);
  if (!executor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ executor });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const executor = await EstatePlanningService.updateExecutor(id, body);
    if (!executor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ executor });
  } catch (e) {
    console.error('[estate-planning/executors] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_executor' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EstatePlanningService.deleteExecutor(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
