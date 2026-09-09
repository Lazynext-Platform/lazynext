import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { AutomationService } from '@/lib/services/automation';

/**
 * GET /api/automations/[id]/runs — list run history for an automation.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const takeParam = sp.get('take');
  const take = takeParam ? Math.min(parseInt(takeParam, 10) || 50, 500) : 50;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    // Verify ownership
    const ownership = await prisma.automation.findFirst({
      where: { id, workspaceId: { in: wsIds } },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const runs = await AutomationService.listRuns(id, take);
    return NextResponse.json({ runs });
  } catch (e) {
    console.error('[automations] list runs error:', e);
    return NextResponse.json({ error: 'failed_to_list_runs' }, { status: 500 });
  }
}
