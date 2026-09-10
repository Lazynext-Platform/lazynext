import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HazardManagementService } from '@/lib/services/hazard-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { hazardCount: 0, riskAssessmentCount: 0, controlMeasureCount: 0, jsaCount: 0, byHazardType: {}, byHazardStatus: {}, byRiskAssessmentType: {}, byRiskAssessmentStatus: {}, byControlMeasureType: {}, byControlMeasureStatus: {}, byJSAType: {}, byJSAStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await HazardManagementService.getHazardManagementStats(organizationId);
  return NextResponse.json({ stats });
}
