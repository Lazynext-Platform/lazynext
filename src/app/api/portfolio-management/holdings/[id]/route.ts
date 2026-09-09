import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const holding = await PortfolioManagementService.getHolding(id);
  if (!holding) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ holding });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const holding = await PortfolioManagementService.updateHolding(id, body);
    if (!holding) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ holding });
  } catch (e) {
    console.error('[portfolio-management/holdings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_holding' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PortfolioManagementService.deleteHolding(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
