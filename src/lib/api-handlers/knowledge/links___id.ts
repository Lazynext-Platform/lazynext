import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/knowledge/links/[id] — remove a link.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    // Verify the link exists and the user has access to its org
    const link = await prisma.knowledgeLink.findUnique({ where: { id } });
    if (!link) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { WorkspaceService } = await import('@/lib/services/workspace');
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === link.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await KnowledgeService.removeLink(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[knowledge/links] delete error:', e);
    return NextResponse.json({ error: 'failed_to_remove_link' }, { status: 500 });
  }
}
