import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/awards/[id] — get a single award */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const award = await GrantService.getAward(id);
  if (!award) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ award });
}

/** PATCH /api/grants/awards/[id] — update an award */
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
    const award = await GrantService.updateAward(id, {
      applicationId: body.applicationId, title: body.title, funder: body.funder,
      amountAwarded: body.amountAwarded, startDate: body.startDate, endDate: body.endDate,
      conditions: body.conditions, reportingRequirements: body.reportingRequirements,
      status: body.status, acceptedDate: body.acceptedDate,
    });
    if (!award) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ award });
  } catch (e) {
    console.error('[grants/awards] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_award' }, { status: 500 });
  }
}
