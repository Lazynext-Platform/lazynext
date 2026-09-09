import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const route = await EmergencyResponseService.getEvacuationRoute(id);
  if (!route) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ route });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const route = await EmergencyResponseService.updateEvacuationRoute(id, body);
    if (!route) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ route });
  } catch (e) {
    console.error('[emergency-response/routes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_route' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EmergencyResponseService.deleteEvacuationRoute(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
