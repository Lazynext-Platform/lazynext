import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const mentorship = await KnowledgeTransferService.holdMentorship(id, session.user.id);
  if (!mentorship) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ mentorship });
}
