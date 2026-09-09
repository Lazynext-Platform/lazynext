import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const printJob = await OfficeServicesService.getPrintJob(id);
  if (!printJob) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ printJob });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const printJob = await OfficeServicesService.updatePrintJob(id, body);
    if (!printJob) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ printJob });
  } catch (e) {
    console.error('[office-services/print] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_print_job' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await OfficeServicesService.deletePrintJob(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
