import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const freight = await LogisticsService.getFreight(id);
  if (!freight) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ freight });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const freight = await LogisticsService.updateFreight(id, body);
    if (!freight) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ freight });
  } catch (e) {
    console.error('[logistics/freight] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_freight' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LogisticsService.deleteFreight(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
