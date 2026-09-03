import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canCreateAutomation } from '@/lib/plan-guard';

/**
 * Internal automation CRUD API (session-auth).
 * POST /api/automations — create an automation.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { name?: string; trigger?: string; definition?: string; workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  const trigger = body.trigger?.trim();
  if (!name || !trigger) {
    return NextResponse.json({ error: 'name_and_trigger_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === body.workspaceId) || workspaces[0];

    // Plan limit check
    const guard = await canCreateAutomation(workspace.id, session.user.id);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
        { status: 402 },
      );
    }

    const automation = await prisma.automation.create({
      data: {
        workspaceId: workspace.id,
        name: name.slice(0, 200),
        trigger: (trigger || '').slice(0, 100),
        definition: (body.definition || '{}').slice(0, 10_000),
        enabled: true,
      },
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (e) {
    console.error('[automations] create error:', e);
    return NextResponse.json(
      { error: 'failed_to_create_automation' },
      { status: 500 },
    );
  }
}
