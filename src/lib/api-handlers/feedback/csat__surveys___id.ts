import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CsatService } from '@/lib/services/csat-service';

/** GET /api/feedback/csat/surveys/[id] — get a CSAT survey */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const survey = await CsatService.getSurvey(id);
  if (!survey) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ survey });
}

/** DELETE /api/feedback/csat/surveys/[id] — delete a CSAT survey */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await CsatService.deleteSurvey(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[feedback/csat/surveys/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_survey' }, { status: 500 });
  }
}
