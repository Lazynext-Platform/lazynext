import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovRelationsService } from '@/lib/services/gov-relations-service';

/** GET /api/gov-relations/lobbying/[id] — get a single lobbying activity */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const lobbying = await GovRelationsService.getLobbying(id);
  if (!lobbying) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ lobbying });
}

/** PATCH /api/gov-relations/lobbying/[id] — update a lobbying activity */
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
    const lobbying = await GovRelationsService.updateLobbying(id, {
      title: body.title, description: body.description, status: body.status,
      contactIds: body.contactIds, policyId: body.policyId,
      startDate: body.startDate, endDate: body.endDate,
      budget: body.budget, spent: body.spent, notes: body.notes,
    });
    if (!lobbying) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lobbying });
  } catch (e) {
    console.error('[gov-relations/lobbying] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_lobbying' }, { status: 500 });
  }
}
