import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { surveillanceCount: 0, examCount: 0, exposureCount: 0, vaccinationCount: 0, bySurveillanceType: {}, bySurveillanceStatus: {}, byExamType: {}, byExamStatus: {}, byExposureType: {}, byExposureStatus: {}, byVaccinationType: {}, byVaccinationStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await OccupationalHealthService.getOccupationalHealthStats(organizationId);
  return NextResponse.json({ stats });
}
