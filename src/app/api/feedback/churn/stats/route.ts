import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChurnPredictionService } from '@/lib/services/churn-prediction-service';

/** GET /api/feedback/churn/stats — get churn stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalCustomers: 0, atRisk: 0, byRiskLevel: { low: 0, medium: 0, high: 0 }, avgRiskScore: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ChurnPredictionService.getStats(organizationId);
  return NextResponse.json({ stats });
}
