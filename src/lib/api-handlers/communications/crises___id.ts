import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/crises/[id] — get a single crisis */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const crisis = await CommunicationsService.getCrisis(id);
  if (!crisis) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ crisis });
}

/** PATCH /api/communications/crises/[id] — update a crisis */
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
    const crisis = await CommunicationsService.updateCrisis(id, {
      title: body.title, description: body.description, severity: body.severity,
      type: body.type, status: body.status, spokesperson: body.spokesperson,
      mediaInquiries: body.mediaInquiries, affectedAudiences: body.affectedAudiences,
      actionPlan: body.actionPlan, timeline: body.timeline,
    });
    if (!crisis) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ crisis });
  } catch (e) {
    console.error('[communications/crises] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_crisis' }, { status: 500 });
  }
}
