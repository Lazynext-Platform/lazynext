import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskService } from '@/lib/services/risk-service';

/** GET /api/risks/by-level — risks grouped by risk level */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ byLevel: { low: [], medium: [], high: [], critical: [] } });
  }

  const organizationId = workspaces[0].organizationId;
  const byLevel = await RiskService.getByLevel(organizationId);
  return NextResponse.json({ byLevel });
}
