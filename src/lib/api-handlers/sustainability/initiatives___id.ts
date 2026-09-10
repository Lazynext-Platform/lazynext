import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/initiatives/[id] — get an initiative */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const initiative = await SustainabilityService.getInitiative(id);
  if (!initiative) {
    return NextResponse.json({ error: 'initiative_not_found' }, { status: 404 });
  }
  return NextResponse.json({ initiative });
}

/** PATCH /api/sustainability/initiatives/[id] — update an initiative */
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
    const initiative = await SustainabilityService.updateInitiative(id, {
      name: body.name,
      category: body.category,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      owner: body.owner,
      budget: body.budget !== undefined ? Number(body.budget) : undefined,
      impact: body.impact,
      sdgGoals: body.sdgGoals,
    });
    if (!initiative) {
      return NextResponse.json({ error: 'initiative_not_found' }, { status: 404 });
    }
    return NextResponse.json({ initiative });
  } catch (e) {
    console.error('[sustainability/initiatives] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_initiative' }, { status: 500 });
  }
}

/** DELETE /api/sustainability/initiatives/[id] — delete an initiative */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await SustainabilityService.deleteInitiative(id);
  if (!ok) {
    return NextResponse.json({ error: 'initiative_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
