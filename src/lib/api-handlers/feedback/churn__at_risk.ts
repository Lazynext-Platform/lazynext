import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChurnPredictionService } from '@/lib/services/churn-prediction-service';

/** GET /api/feedback/churn/at-risk — get at-risk customers */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ customers: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const thresholdParam = url.searchParams.get('threshold');
  const threshold = thresholdParam ? parseInt(thresholdParam, 10) : 30;

  const customers = await ChurnPredictionService.getAtRiskCustomers(organizationId, threshold);
  return NextResponse.json({ customers });
}
