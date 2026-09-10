import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisCommunicationService } from '@/lib/services/crisis-communication-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const message = await CrisisCommunicationService.getCrisisMessage(id);
  if (!message) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ message });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const message = await CrisisCommunicationService.updateCrisisMessage(id, body);
    if (!message) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ message });
  } catch (e) {
    console.error('[crisis-communication/messages] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_message' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CrisisCommunicationService.deleteCrisisMessage(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
