import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NpsService } from '@/lib/services/nps-service';

/** GET /api/feedback/nps/surveys/[id] — get an NPS survey */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const survey = await NpsService.getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ survey });
}

/** PATCH /api/feedback/nps/surveys/[id] — update an NPS survey */
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
    const survey = await NpsService.updateSurvey(id, {
      name: body.name,
      question: body.question,
      followUpQuestion: body.followUpQuestion,
      status: body.status,
    });
    return NextResponse.json({ survey });
  } catch (e) {
    console.error('[feedback/nps/surveys/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_survey' }, { status: 500 });
  }
}

/** DELETE /api/feedback/nps/surveys/[id] — delete an NPS survey */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await NpsService.deleteSurvey(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[feedback/nps/surveys/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_survey' }, { status: 500 });
  }
}
