import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/success-plans/[id] — get a single success plan */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const successPlan = await CustomerSuccessService.getSuccessPlan(id);
  if (!successPlan) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ successPlan });
}

/** PATCH /api/customer-success/success-plans/[id] — update a success plan */
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
    const successPlan = await CustomerSuccessService.updateSuccessPlan(id, {
      name: body.name, description: body.description, goals: body.goals,
      milestones: body.milestones, status: body.status, owner: body.owner,
      startDate: body.startDate, endDate: body.endDate,
    });
    if (!successPlan) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ successPlan });
  } catch (e) {
    console.error('[customer-success/success-plans] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_success_plan' }, { status: 500 });
  }
}

/** DELETE /api/customer-success/success-plans/[id] — delete a success plan */
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
    const ok = await CustomerSuccessService.deleteSuccessPlan(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[customer-success/success-plans] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_success_plan' }, { status: 500 });
  }
}
