import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisCommunicationService } from '@/lib/services/crisis-communication-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const inquiry = await CrisisCommunicationService.getMediaInquiry(id);
  if (!inquiry) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ inquiry });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const inquiry = await CrisisCommunicationService.updateMediaInquiry(id, body);
    if (!inquiry) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ inquiry });
  } catch (e) {
    console.error('[crisis-communication/inquiries] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_inquiry' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CrisisCommunicationService.deleteMediaInquiry(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
