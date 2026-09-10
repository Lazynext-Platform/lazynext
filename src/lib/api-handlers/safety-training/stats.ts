import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { courseCount: 0, enrollmentCount: 0, certificationCount: 0, complianceCount: 0, byCourseType: {}, byCourseStatus: {}, byEnrollmentType: {}, byEnrollmentStatus: {}, byCertificationType: {}, byCertificationStatus: {}, byComplianceType: {}, byComplianceStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await SafetyTrainingService.getSafetyTrainingStats(organizationId);
  return NextResponse.json({ stats });
}
