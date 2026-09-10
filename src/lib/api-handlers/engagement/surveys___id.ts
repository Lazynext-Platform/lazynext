import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/surveys/[id] — get a single survey */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const survey = await EngagementService.getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ survey });
}

/** PATCH /api/engagement/surveys/[id] — update a survey */
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
    const survey = await EngagementService.updateSurvey(id, {
      title: body.title,
      surveyType: body.type ?? body.surveyType,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      anonymous: body.anonymous,
      targetAudience: body.targetAudience,
      expectedResponses: body.expectedResponses,
      notes: body.notes,
    });
    if (!survey) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ survey });
  } catch (e) {
    console.error('[engagement/surveys] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_survey' }, { status: 500 });
  }
}

/** DELETE /api/engagement/surveys/[id] — delete a survey */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await EngagementService.deleteSurvey(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
