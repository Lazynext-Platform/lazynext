import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canCreateAutomation } from '@/lib/plan-guard';
import { AutomationService } from '@/lib/services/automation';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * Internal automation CRUD API (session-auth).
 * GET /api/automations — list automations for the user's workspaces.
 * POST /api/automations — create an automation.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get('workspaceId') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);

    if (workspaceId) {
      // Verify membership of the requested workspace
      if (!wsIds.includes(workspaceId)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      const automations = await AutomationService.list(workspaceId);
      return NextResponse.json({ automations });
    }

    // No workspace specified — return automations across all user workspaces
    const automations = await prisma.automation.findMany({
      where: { workspaceId: { in: wsIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { runs: true } } },
    });
    return NextResponse.json({ automations });
  } catch (e) {
    console.error('[automations] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_automations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

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
