import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const article = await KnowledgeTransferService.getArticle(id);
  if (!article) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const article = await KnowledgeTransferService.updateArticle(id, body);
    if (!article) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ article });
  } catch (e) {
    console.error('[knowledge-transfer/articles] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_article' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await KnowledgeTransferService.deleteArticle(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
