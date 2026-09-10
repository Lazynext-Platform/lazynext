import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * POST /api/deployments/[id]/cancel — cancel a deployment.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const deployment = await DeploymentService.cancelDeployment(id);
    return NextResponse.json({ deployment });
  } catch (e) {
    console.error('[deployments] cancel error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_cancel_deployment' },
      { status: 500 },
    );
  }
}
