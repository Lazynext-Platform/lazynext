import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/stewardship — list stewardship assignments */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stewardship: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { catalogEntryId?: string; role?: string; status?: string } = {};
  const catalogEntryId = url.searchParams.get('catalogEntryId');
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  if (catalogEntryId) opts.catalogEntryId = catalogEntryId;
  if (role) opts.role = role;
  if (status) opts.status = status;

  const stewardship = await DataGovernanceService.listStewardship(organizationId, opts as never);
  return NextResponse.json({ stewardship });
}

/** POST /api/data-governance/stewardship — create a stewardship assignment */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const stewardName = String(body.stewardName || '').trim();
  const role = String(body.role || '').trim();
  if (!stewardName || !role) {
    return NextResponse.json({ error: 'stewardName_role_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const stewardship = await DataGovernanceService.createStewardship(
      ws.organizationId, ws.id,
      {
        stewardName, role: role as never,
        catalogEntryId: body.catalogEntryId, responsibilities: body.responsibilities,
        accountability: body.accountability, accessLevel: body.accessLevel, status: body.status,
      },
      session.user.id,
    );
    return NextResponse.json({ stewardship }, { status: 201 });
  } catch (e) {
    console.error('[data-governance/stewardship] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_stewardship' }, { status: 500 });
  }
}
