import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const recipient = await GiftManagementService.getRecipient(id);
  if (!recipient) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ recipient });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const recipient = await GiftManagementService.updateRecipient(id, body);
    if (!recipient) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ recipient });
  } catch (e) {
    console.error('[gift-management/recipients] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_recipient' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await GiftManagementService.deleteRecipient(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
