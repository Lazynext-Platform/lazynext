import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ApiUsageLogger } from '@/lib/services/api-usage-logger';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ errorRate: 0, totalErrors: 0, totalRequests: 0 });
  const organizationId = workspaces[0].organizationId;
  const days = parseInt(req.nextUrl.searchParams.get('days') || '7', 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await ApiUsageLogger.getErrorRate(organizationId, { startDate });
  return NextResponse.json(result);
}
