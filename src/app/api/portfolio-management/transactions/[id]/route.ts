import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const transaction = await PortfolioManagementService.getTransaction(id);
  if (!transaction) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ transaction });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const transaction = await PortfolioManagementService.updateTransaction(id, body);
    if (!transaction) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error('[portfolio-management/transactions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_transaction' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PortfolioManagementService.deleteTransaction(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
