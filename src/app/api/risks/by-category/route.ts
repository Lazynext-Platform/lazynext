import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskService } from '@/lib/services/risk-service';

/** GET /api/risks/by-category — risks grouped by category */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ byCategory: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const byCategory = await RiskService.getByCategory(organizationId);
  return NextResponse.json({ byCategory });
}
