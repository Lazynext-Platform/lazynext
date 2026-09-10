import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const supply = await PrintServicesService.getSupply(id);
  if (!supply) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ supply });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const supply = await PrintServicesService.updateSupply(id, body);
    if (!supply) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ supply });
  } catch (e) {
    console.error('[print-services/supplies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_supply' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PrintServicesService.deleteSupply(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
