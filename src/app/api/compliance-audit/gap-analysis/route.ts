import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/gap-analysis — get gap analysis */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ gaps: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const frameworkId = url.searchParams.get('frameworkId') ?? undefined;

  const gaps = await ComplianceAuditService.getGapAnalysis(organizationId, frameworkId ? { frameworkId } : {});
  return NextResponse.json({ gaps });
}
