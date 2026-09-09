import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const request = await OfficeServicesService.getRequest(id);
  if (!request) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const request = await OfficeServicesService.updateRequest(id, body);
    if (!request) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[office-services/requests] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_request' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await OfficeServicesService.deleteRequest(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
