import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const sessionRecord = await KnowledgeTransferService.startSession(id, session.user.id);
  if (!sessionRecord) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ session: sessionRecord });
}
