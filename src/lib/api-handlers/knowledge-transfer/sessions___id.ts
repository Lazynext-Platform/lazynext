import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const sessionRecord = await KnowledgeTransferService.getSession(id);
  if (!sessionRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ session: sessionRecord });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const sessionRecord = await KnowledgeTransferService.updateSession(id, body);
    if (!sessionRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ session: sessionRecord });
  } catch (e) {
    console.error('[knowledge-transfer/sessions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_session' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await KnowledgeTransferService.deleteSession(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
