import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';

/** GET /api/compliance-audit/controls — list controls */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ controls: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { frameworkId?: string; status?: string; category?: string; owner?: string } = {};
  const frameworkId = url.searchParams.get('frameworkId');
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const owner = url.searchParams.get('owner');
  if (frameworkId) opts.frameworkId = frameworkId;
  if (status) opts.status = status;
  if (category) opts.category = category;
  if (owner) opts.owner = owner;

  const controls = await ComplianceAuditService.listControls(organizationId, opts as never);
  return NextResponse.json({ controls });
}

/** POST /api/compliance-audit/controls — create a control */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const frameworkId = String(body.frameworkId || '').trim();
  const controlId = String(body.controlId || '').trim();
  const title = String(body.title || '').trim();
  if (!frameworkId || !controlId || !title) {
    return NextResponse.json({ error: 'frameworkId_controlId_title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const control = await ComplianceAuditService.createControl(
      ws.organizationId, ws.id,
      { frameworkId, controlId, title, description: body.description, category: body.category, frequency: body.frequency, owner: body.owner, status: body.status },
      session.user.id,
    );
    return NextResponse.json({ control }, { status: 201 });
  } catch (e) {
    console.error('[compliance-audit/controls] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_control' }, { status: 500 });
  }
}
