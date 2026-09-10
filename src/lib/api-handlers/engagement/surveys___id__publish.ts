import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngagementService } from '@/lib/services/engagement-service';

/** POST /api/engagement/surveys/[id]/publish — publish a survey */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const survey = await EngagementService.publishSurvey(id, session.user.id);
    if (!survey) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ survey });
  } catch (e) {
    console.error('[engagement/surveys/publish] error:', e);
    return NextResponse.json({ error: 'failed_to_publish_survey' }, { status: 500 });
  }
}
