import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { NpsService } from '@/lib/services/nps-service';

/** GET /api/feedback/nps/surveys/[id]/responses — list NPS responses */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const url = new URL(req.url);
  const minScore = url.searchParams.get('minScore');
  const maxScore = url.searchParams.get('maxScore');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const opts: Record<string, unknown> = {};
  if (minScore && maxScore) {
    opts.scoreRange = [parseInt(minScore, 10), parseInt(maxScore, 10)];
  }
  if (startDate && endDate) {
    opts.dateRange = [new Date(startDate), new Date(endDate)];
  }

  const responses = await NpsService.getResponses(id, opts);
  return NextResponse.json({ responses });
}

/** POST /api/feedback/nps/surveys/[id]/responses — submit an NPS response */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const score = Number(body.score);
  if (isNaN(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: 'invalid_score' }, { status: 400 });
  }

  try {
    const response = await NpsService.submitResponse(id, {
      score,
      comment: body.comment,
      customerId: body.customerId,
      respondentName: body.respondentName,
      respondentEmail: body.respondentEmail,
    });
    return NextResponse.json({ response }, { status: 201 });
  } catch (e) {
    console.error('[feedback/nps/responses] submit error:', e);
    return NextResponse.json({ error: 'failed_to_submit_response' }, { status: 500 });
  }
}
