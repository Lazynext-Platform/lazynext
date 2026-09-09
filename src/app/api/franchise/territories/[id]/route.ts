import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/territories/[id] — get a single territory */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const territory = await FranchiseService.getTerritory(id);
  if (!territory) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ territory });
}

/** PATCH /api/franchise/territories/[id] — update a territory */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const territory = await FranchiseService.updateTerritory(id, {
      name: body.name, description: body.description, boundaries: body.boundaries,
      population: body.population, demographics: body.demographics,
      marketPotential: body.marketPotential, existingLocations: body.existingLocations,
      exclusivity: body.exclusivity, status: body.status, assignedTo: body.assignedTo,
    });
    if (!territory) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ territory });
  } catch (e) {
    console.error('[franchise/territories] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_territory' }, { status: 500 });
  }
}

/** DELETE /api/franchise/territories/[id] — delete a territory */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await FranchiseService.deleteTerritory(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[franchise/territories] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_territory' }, { status: 500 });
  }
}
