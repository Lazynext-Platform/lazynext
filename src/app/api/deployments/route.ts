import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeploymentService } from '@/lib/services/deployment';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/deployments — list deployments (query: workspaceId, status, environment).
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
  const status = sp.get('status') || undefined;
  const environment = sp.get('environment') || undefined;

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ deployments: [] });
    }

    let wsId = workspaceId;
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const deployments = await DeploymentService.listDeployments(wsId, { status, environment });
    return NextResponse.json({ deployments });
  } catch (e) {
    console.error('[deployments] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_deployments' }, { status: 500 });
  }
}

/**
 * POST /api/deployments — create a new deployment.
 * Body: { environment?, trigger?, prNumber?, commitSha?, branch?, triggeredBy? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    workspaceId?: string;
    environment?: string;
    trigger?: string;
    prNumber?: number;
    commitSha?: string;
    branch?: string;
    triggeredBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let wsId = body.workspaceId?.trim();
    if (wsId) {
      const hasAccess = workspaces.some((w) => w.id === wsId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else {
      wsId = workspaces[0].id;
    }

    const deployment = await DeploymentService.createDeployment(wsId, {
      environment: body.environment?.trim() || undefined,
      trigger: body.trigger?.trim() || undefined,
      prNumber: body.prNumber,
      commitSha: body.commitSha?.trim() || undefined,
      branch: body.branch?.trim() || undefined,
      triggeredBy: body.triggeredBy?.trim() || session.user.id,
    });

    return NextResponse.json({ deployment }, { status: 201 });
  } catch (e) {
    console.error('[deployments] create error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_create_deployment' },
      { status: 500 },
    );
  }
}
