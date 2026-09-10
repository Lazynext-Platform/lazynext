import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/stats — get training stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { courseCount: 0, enrollmentCount: 0, certificationCount: 0, learningPathCount: 0, assessmentCount: 0, completedEnrollmentCount: 0, activeEnrollmentCount: 0, verifiedCertificationCount: 0, completionRate: 0, avgScore: 0, byCourseCategory: {}, byEnrollmentStatus: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await TrainingService.getStats(organizationId);
  return NextResponse.json({ stats });
}
