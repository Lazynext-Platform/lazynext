import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const allocation = await PortfolioManagementService.getAllocation(id);
  if (!allocation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ allocation });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const allocation = await PortfolioManagementService.updateAllocation(id, body);
    if (!allocation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[portfolio-management/allocations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_allocation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PortfolioManagementService.deleteAllocation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
