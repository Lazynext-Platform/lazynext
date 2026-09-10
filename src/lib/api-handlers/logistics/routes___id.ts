import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const route = await LogisticsService.getRoute(id);
  if (!route) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ route });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const route = await LogisticsService.updateRoute(id, body);
    if (!route) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ route });
  } catch (e) {
    console.error('[logistics/routes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_route' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LogisticsService.deleteRoute(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
