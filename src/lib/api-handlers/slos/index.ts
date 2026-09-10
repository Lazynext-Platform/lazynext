import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SLOService } from '@/lib/services/slo-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/slos — list all SLOs.
 */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ slos: [] });
    }
    const organizationId = workspaces[0].organizationId;

    const slos = await SLOService.listSLOs(organizationId);
    return NextResponse.json({ slos });
  } catch (e) {
    console.error('[slos] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_slos' }, { status: 500 });
  }
}

/**
 * POST /api/slos — create an SLO.
 * Body: { organizationId?, name, description?, metricName, target, targetPercentile?, windowDays?, errorBudget? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    name?: string;
    description?: string;
    metricName?: string;
    target?: number;
    targetPercentile?: number;
    windowDays?: number;
    errorBudget?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!body.metricName?.trim()) {
    return NextResponse.json({ error: 'metricName_required' }, { status: 400 });
  }
  if (body.target === undefined || body.target === null || Number.isNaN(body.target)) {
    return NextResponse.json({ error: 'target_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let organizationId = body.organizationId?.trim();
    if (organizationId) {
      const hasAccess = workspaces.some((w) => w.organizationId === organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      organizationId = workspaces[0].organizationId;
    }

    const slo = await SLOService.createSLO(organizationId, {
      name: body.name.trim(),
      description: body.description,
      metricName: body.metricName.trim(),
      target: body.target,
      targetPercentile: body.targetPercentile,
      windowDays: body.windowDays,
      errorBudget: body.errorBudget,
    });
    return NextResponse.json({ slo }, { status: 201 });
  } catch (e) {
    console.error('[slos] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_slo' }, { status: 500 });
  }
}
