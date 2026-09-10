import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PermissionService } from '@/lib/services/permission-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: {"policyCount":0,"roleCount":0,"grantCount":0,"checkCount":0,"byPolicyType":{},"byPolicyStatus":{},"byRoleType":{},"byRoleStatus":{},"byGrantType":{},"byGrantStatus":{},"byCheckType":{},"byCheckStatus":{}} });
  const organizationId = workspaces[0].organizationId;
  const stats = await PermissionService.getPermissionStats(organizationId);
  return NextResponse.json({ stats });
}
