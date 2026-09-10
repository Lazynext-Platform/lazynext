import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const expense = await RelocationService.getExpense(id);
  if (!expense) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const expense = await RelocationService.updateExpense(id, body);
    if (!expense) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ expense });
  } catch (e) {
    console.error('[relocation/expenses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_expense' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RelocationService.deleteExpense(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
