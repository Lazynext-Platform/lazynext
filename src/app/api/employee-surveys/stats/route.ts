import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { surveyCount: 0, activeSurveyCount: 0, responseCount: 0, submittedResponseCount: 0, questionCount: 0, campaignCount: 0, activeCampaignCount: 0, bySurveyType: {}, bySurveyStatus: {}, byResponseStatus: {}, byQuestionType: {}, byCampaignType: {}, byCampaignStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EmployeeSurveysService.getEmployeeSurveyStats(organizationId);
  return NextResponse.json({ stats });
}
