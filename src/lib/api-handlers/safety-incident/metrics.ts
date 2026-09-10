import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { reportedIncidents: 0, activeInvestigations: 0, completedRCAs: 0, activeCorrectiveActions: 0, overdueActions: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await SafetyIncidentService.getSafetyIncidentMetrics(organizationId);
  return NextResponse.json({ metrics });
}
