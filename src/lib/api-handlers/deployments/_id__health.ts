import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * GET /api/deployments/[id]/health — check the health of a deployment.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await DeploymentService.getDeployment(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const result = await DeploymentService.checkHealth(id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[deployments] health error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_check_health' },
      { status: 500 },
    );
  }
}
