import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const job = await PrintServicesService.getJob(id);
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const job = await PrintServicesService.updateJob(id, body);
    if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    console.error('[print-services/jobs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_job' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PrintServicesService.deleteJob(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
