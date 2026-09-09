import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** GET /api/itsm/knowledge/[id] — get a single knowledge article */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const article = await KnowledgeBaseService.get(id);
  if (!article) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ article });
}

/** PATCH /api/itsm/knowledge/[id] — update a knowledge article */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const article = await KnowledgeBaseService.update(id, {
      title: body.title,
      content: body.content,
      category: body.category,
      type: body.type,
      status: body.status,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ article });
  } catch (e) {
    console.error('[itsm/knowledge] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_article' }, { status: 500 });
  }
}

/** DELETE /api/itsm/knowledge/[id] — delete a knowledge article */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await KnowledgeBaseService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[itsm/knowledge] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_article' }, { status: 500 });
  }
}
