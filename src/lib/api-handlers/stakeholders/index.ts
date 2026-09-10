import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders — list stakeholders */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stakeholders: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { type?: string; influence?: string; interest?: string; category?: string } = {};
  const type = url.searchParams.get('type');
  const influence = url.searchParams.get('influence');
  const interest = url.searchParams.get('interest');
  const category = url.searchParams.get('category');
  if (type) opts.type = type;
  if (influence) opts.influence = influence;
  if (interest) opts.interest = interest;
  if (category) opts.category = category;

  const stakeholders = await StakeholderService.listStakeholders(organizationId, opts as never);
  return NextResponse.json({ stakeholders });
}

/** POST /api/stakeholders — create a stakeholder */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const influence = String(body.influence || '').trim();
  const interest = String(body.interest || '').trim();
  if (!name || !type || !influence || !interest) {
    return NextResponse.json({ error: 'name_type_influence_interest_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const stakeholder = await StakeholderService.createStakeholder(
      ws.organizationId, ws.id,
      {
        name, type: type as never, organization: body.organization, role: body.role,
        email: body.email, phone: body.phone, influence: influence as never,
        interest: interest as never, category: body.category, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ stakeholder }, { status: 201 });
  } catch (e) {
    console.error('[stakeholders] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_stakeholder' }, { status: 500 });
  }
}
