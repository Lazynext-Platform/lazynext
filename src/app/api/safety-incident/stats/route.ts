import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { incidentCount: 0, investigationCount: 0, rcaCount: 0, correctiveActionCount: 0, byIncidentType: {}, byIncidentStatus: {}, byInvestigationType: {}, byInvestigationStatus: {}, byRCAType: {}, byRCAStatus: {}, byCorrectiveActionType: {}, byCorrectiveActionStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await SafetyIncidentService.getSafetyIncidentStats(organizationId);
  return NextResponse.json({ stats });
}
