import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const delivery = await MailroomOperationsService.getDelivery(id);
  if (!delivery) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ delivery });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const delivery = await MailroomOperationsService.updateDelivery(id, body);
    if (!delivery) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ delivery });
  } catch (e) {
    console.error('[mailroom-operations/deliveries] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_delivery' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await MailroomOperationsService.deleteDelivery(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
