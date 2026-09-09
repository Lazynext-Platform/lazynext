import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';

/** GET /api/grants/applications/[id] — get a single application */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const application = await GrantService.getApplication(id);
  if (!application) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ application });
}

/** PATCH /api/grants/applications/[id] — update an application */
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
    const application = await GrantService.updateApplication(id, {
      opportunityId: body.opportunityId, title: body.title, funder: body.funder,
      amountRequested: body.amountRequested, narrative: body.narrative, budget: body.budget,
      timeline: body.timeline, team: body.team, status: body.status,
      submittedDate: body.submittedDate, deadline: body.deadline, attachments: body.attachments,
    });
    if (!application) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ application });
  } catch (e) {
    console.error('[grants/applications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_application' }, { status: 500 });
  }
}
