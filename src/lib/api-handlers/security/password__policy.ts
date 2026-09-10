import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PasswordPolicyService } from '@/lib/services/password-policy-service';

/** GET /api/security/password/policy — get password policy for org */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const organizationId = workspaces.length > 0 ? workspaces[0].organizationId : 'default';

  try {
    const policy = await PasswordPolicyService.getPolicyForOrg(organizationId);
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[security/password/policy] error:', e);
    return NextResponse.json({ error: 'failed_to_get_policy' }, { status: 500 });
  }
}

/** PATCH /api/security/password/policy — update password policy for org */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const policy = await PasswordPolicyService.setPolicy(organizationId, body);
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[security/password/policy] error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}
