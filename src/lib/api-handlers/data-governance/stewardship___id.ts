import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/stewardship/[id] — get a single stewardship assignment */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const stewardship = await DataGovernanceService.getStewardship(id);
  if (!stewardship) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ stewardship });
}

/** PATCH /api/data-governance/stewardship/[id] — update a stewardship assignment */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const stewardship = await DataGovernanceService.updateStewardship(id, {
      catalogEntryId: body.catalogEntryId, stewardName: body.stewardName, role: body.role,
      responsibilities: body.responsibilities, accountability: body.accountability,
      accessLevel: body.accessLevel, status: body.status,
    });
    if (!stewardship) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ stewardship });
  } catch (e) {
    console.error('[data-governance/stewardship] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_stewardship' }, { status: 500 });
  }
}

/** DELETE /api/data-governance/stewardship/[id] — delete a stewardship assignment */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await DataGovernanceService.deleteStewardship(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data-governance/stewardship] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_stewardship' }, { status: 500 });
  }
}
