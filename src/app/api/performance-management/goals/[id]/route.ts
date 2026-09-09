import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const goal = await PerformanceManagementService.getGoal(id);
  if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const goal = await PerformanceManagementService.updateGoal(id, body);
    if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (e) {
    console.error('[performance-management/goals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_goal' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PerformanceManagementService.deleteGoal(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
