import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { AutomationDispatcher } from '@/lib/automation/dispatcher';

/**
 * GET /api/automations/dispatch-stats?automationId=... — dispatch stats for an automation.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const automationId = sp.get('automationId');
  if (!automationId) {
    return NextResponse.json({ error: 'automationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    const ownership = await prisma.automation.findFirst({
      where: { id: automationId, workspaceId: { in: wsIds } },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const stats = await AutomationDispatcher.getDispatchStats(automationId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('[automations/dispatch-stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
