import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const newDate = String(body.newDate || '').trim();
  if (!newDate) return NextResponse.json({ error: 'newDate_required' }, { status: 400 });
  const sessionRecord = await KnowledgeTransferService.postponeSession(id, newDate, session.user.id);
  if (!sessionRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ session: sessionRecord });
}
