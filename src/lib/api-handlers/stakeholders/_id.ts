import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { StakeholderService } from '@/lib/services/stakeholder-service';

/** GET /api/stakeholders/[id] — get a single stakeholder */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const stakeholder = await StakeholderService.getStakeholder(id);
  if (!stakeholder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ stakeholder });
}

/** PATCH /api/stakeholders/[id] — update a stakeholder */
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
    const stakeholder = await StakeholderService.updateStakeholder(id, {
      name: body.name, type: body.type, organization: body.organization, role: body.role,
      email: body.email, phone: body.phone, influence: body.influence, interest: body.interest,
      category: body.category, notes: body.notes,
    });
    if (!stakeholder) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ stakeholder });
  } catch (e) {
    console.error('[stakeholders] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_stakeholder' }, { status: 500 });
  }
}

/** DELETE /api/stakeholders/[id] — delete a stakeholder */
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
    const ok = await StakeholderService.deleteStakeholder(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[stakeholders] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_stakeholder' }, { status: 500 });
  }
}
