import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management/filing-schedule — get filing schedules */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ schedules: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const schedules = await TaxManagementService.getFilingSchedule(organizationId);
  return NextResponse.json({ schedules });
}

/** POST /api/tax-management/filing-schedule — create a filing schedule */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.jurisdiction || !body.type || !body.frequency || body.dueDay === undefined) {
    return NextResponse.json({ error: 'jurisdiction_type_frequency_dueday_required' }, { status: 400 });
  }

  try {
    const schedule = await TaxManagementService.createFilingSchedule(
      organizationId,
      workspaceId,
      {
        jurisdiction: body.jurisdiction,
        type: body.type,
        frequency: body.frequency,
        dueDay: Number(body.dueDay),
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e) {
    console.error('[tax-management] filing schedule error:', e);
    return NextResponse.json({ error: 'failed_to_create_filing_schedule' }, { status: 500 });
  }
}
