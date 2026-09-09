import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {} });
  const organizationId = workspaces[0].organizationId;
  const stats = await InternalAuditService.getInternalAuditStats(organizationId);
  return NextResponse.json({ stats });
}
