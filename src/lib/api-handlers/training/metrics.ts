import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/metrics — get training metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { completionRate: 0, activeEnrollments: 0, certificationCompliance: 0, popularCourses: [], avgScore: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await TrainingService.getTrainingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
