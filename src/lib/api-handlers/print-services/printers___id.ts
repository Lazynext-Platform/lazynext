import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const printer = await PrintServicesService.getPrinter(id);
  if (!printer) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ printer });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const printer = await PrintServicesService.updatePrinter(id, body);
    if (!printer) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ printer });
  } catch (e) {
    console.error('[print-services/printers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_printer' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PrintServicesService.deletePrinter(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
