import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/opportunities/[id] — get a single opportunity */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const opportunity = await GrantService.getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ opportunity });
}

/** PATCH /api/grants/opportunities/[id] — update an opportunity */
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
    const opportunity = await GrantService.updateOpportunity(id, {
      name: body.name, funder: body.funder, program: body.program, eligibility: body.eligibility,
      amount: body.amount, deadline: body.deadline, status: body.status, category: body.category,
      duration: body.duration, matchScore: body.matchScore, description: body.description,
    });
    if (!opportunity) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ opportunity });
  } catch (e) {
    console.error('[grants/opportunities] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_opportunity' }, { status: 500 });
  }
}

/** DELETE /api/grants/opportunities/[id] — delete an opportunity */
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
    const ok = await GrantService.deleteOpportunity(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[grants/opportunities] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_opportunity' }, { status: 500 });
  }
}
