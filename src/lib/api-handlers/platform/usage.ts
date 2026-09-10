import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ApiUsageLogger } from '@/lib/services/api-usage-logger';

/** GET /api/platform/usage — organization-wide usage stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalRequests: 0, rateLimitedRequests: 0, avgResponseTime: 0, errorCount: 0, errorRate: 0, byEndpoint: [], byMethod: [], byStatusCode: [] } });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;
  const startDate = sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined;
  const endDate = sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined;
  const apiKeyId = sp.get('apiKeyId') || undefined;

  const stats = await ApiUsageLogger.getUsageStats(organizationId, { startDate, endDate, apiKeyId });
  return NextResponse.json({ stats });
}
