import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeCourses: 0, completedEnrollments: 0, activeCertifications: 0, compliantEmployees: 0, overdueCompliance: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await SafetyTrainingService.getSafetyTrainingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
