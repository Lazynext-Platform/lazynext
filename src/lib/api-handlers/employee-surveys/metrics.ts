import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { totalSurveys: 0, activeSurveys: 0, totalResponses: 0, submittedResponses: 0, averageScore: 0, activeCampaigns: 0, participationRate: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await EmployeeSurveysService.getEmployeeSurveyMetrics(organizationId);
  return NextResponse.json({ metrics });
}
