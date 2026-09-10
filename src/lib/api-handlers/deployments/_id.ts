import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * GET /api/deployments/[id] — get a deployment by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const deployment = await DeploymentService.getDeployment(id);
    if (!deployment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ deployment });
  } catch (e) {
    console.error('[deployments] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_deployment' }, { status: 500 });
  }
}

/**
 * PATCH /api/deployments/[id] — update a deployment.
 * Body: { environment?, status?, trigger?, prNumber?, commitSha?, branch?, healthCheckUrl?, healthStatus?, approvedBy? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    environment?: string;
    status?: string;
    trigger?: string;
    prNumber?: number | null;
    commitSha?: string | null;
    branch?: string | null;
    healthCheckUrl?: string | null;
    healthStatus?: string | null;
    approvedBy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await DeploymentService.getDeployment(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await DeploymentService.updateDeployment(id, {
      environment: body.environment?.trim(),
      status: body.status?.trim(),
      trigger: body.trigger?.trim(),
      prNumber: body.prNumber,
      commitSha: body.commitSha,
      branch: body.branch,
      healthCheckUrl: body.healthCheckUrl,
      healthStatus: body.healthStatus,
      approvedBy: body.approvedBy?.trim() || session.user.id,
    });

    return NextResponse.json({ deployment: updated });
  } catch (e) {
    console.error('[deployments] update error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_update_deployment' },
      { status: 500 },
    );
  }
}
