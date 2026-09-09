import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ApiUsageLogger } from '@/lib/services/api-usage-logger';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ requests: [] });
  const organizationId = workspaces[0].organizationId;
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
  const requests = await ApiUsageLogger.getSlowRequests(organizationId, limit);
  return NextResponse.json({ requests });
}
