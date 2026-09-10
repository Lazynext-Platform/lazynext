import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** POST /api/itsm/knowledge/[id]/archive — archive a knowledge article */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const article = await KnowledgeBaseService.archiveArticle(id);
    return NextResponse.json({ article });
  } catch (e) {
    console.error('[itsm/knowledge/archive] error:', e);
    return NextResponse.json({ error: 'failed_to_archive' }, { status: 500 });
  }
}
