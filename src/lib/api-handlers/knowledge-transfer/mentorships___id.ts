import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const mentorship = await KnowledgeTransferService.getMentorship(id);
  if (!mentorship) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ mentorship });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const mentorship = await KnowledgeTransferService.updateMentorship(id, body);
    if (!mentorship) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ mentorship });
  } catch (e) {
    console.error('[knowledge-transfer/mentorships] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_mentorship' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await KnowledgeTransferService.deleteMentorship(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
