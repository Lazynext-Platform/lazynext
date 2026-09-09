import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeploymentService } from '@/lib/services/deployment';

/**
 * POST /api/deployments/[id]/rollback — roll back to a previous deployment.
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

    const rollbackDeployment = await DeploymentService.rollback(id);
    return NextResponse.json({ deployment: rollbackDeployment });
  } catch (e) {
    console.error('[deployments] rollback error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed_to_rollback' },
      { status: 500 },
    );
  }
}
