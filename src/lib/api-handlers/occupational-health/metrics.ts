import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { scheduledSurveillances: 0, completedExams: 0, activeExposures: 0, administeredVaccinations: 0, overdueSurveillances: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await OccupationalHealthService.getOccupationalHealthMetrics(organizationId);
  return NextResponse.json({ metrics });
}
