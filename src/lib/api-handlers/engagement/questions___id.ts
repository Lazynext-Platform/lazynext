import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/questions/[id] — get a single question */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const question = await EngagementService.getQuestion(id);
  if (!question) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ question });
}

/** PATCH /api/engagement/questions/[id] — update a question */
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
    const question = await EngagementService.updateQuestion(id, {
      questionText: body.question ?? body.questionText,
      questionType: body.type ?? body.questionType,
      options: body.options,
      required: body.required,
      order: body.order,
      notes: body.notes,
    });
    if (!question) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (e) {
    console.error('[engagement/questions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_question' }, { status: 500 });
  }
}

/** DELETE /api/engagement/questions/[id] — delete a question */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await EngagementService.deleteQuestion(id);
  if (!ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
