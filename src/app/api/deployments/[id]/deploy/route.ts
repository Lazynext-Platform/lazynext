import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * POST /api/deployments/[id]/deploy — trigger a deploy for a deployment.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await DeploymentService.getDeployment(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const result = await DeploymentService.triggerDeploy(id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[deployments] deploy error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_trigger_deploy' },
      { status: 500 },
    );
  }
}
