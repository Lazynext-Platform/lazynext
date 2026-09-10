import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';

/** GET /api/partners/tiers — list tiers */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ tiers: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const tiers = await PartnerService.listTiers(organizationId);
  return NextResponse.json({ tiers });
}

/** POST /api/partners/tiers — create a tier */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const level = String(body.level || '').trim();
  if (!name || !level) {
    return NextResponse.json({ error: 'name_and_level_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const tier = await PartnerService.createTier(
      ws.organizationId, ws.id,
      {
        name, level: level as never,
        requirements: body.requirements ?? {},
        benefits: body.benefits ?? {},
        description: body.description,
      },
      session.user.id,
    );
    return NextResponse.json({ tier }, { status: 201 });
  } catch (e) {
    console.error('[partners/tiers] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_tier' }, { status: 500 });
  }
}
