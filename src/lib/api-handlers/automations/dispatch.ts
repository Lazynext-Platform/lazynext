import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { AutomationDispatcher } from '@/lib/automation/dispatcher';

/**
 * POST /api/automations/dispatch — dispatch an automation.
 * Body: { automationId, trigger, payload }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { automationId?: string; trigger?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const automationId = body.automationId?.trim();
  const trigger = body.trigger?.trim();
  if (!automationId || !trigger) {
    return NextResponse.json({ error: 'automationId_and_trigger_required' }, { status: 400 });
  }

  try {
    // Verify ownership.
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    const ownership = await prisma.automation.findFirst({
      where: { id: automationId, workspaceId: { in: wsIds } },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const run = await AutomationDispatcher.dispatch(automationId, trigger, body.payload ?? {});
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_dispatch';
    if (msg === 'automation_not_found' || msg === 'automation_disabled' || msg === 'trigger_mismatch') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[automations/dispatch] error:', e);
    return NextResponse.json({ error: 'failed_to_dispatch' }, { status: 500 });
  }
}
