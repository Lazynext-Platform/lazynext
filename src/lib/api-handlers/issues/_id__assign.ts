import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IssueService } from '@/lib/services/issue-service';

/** POST /api/issues/[id]/assign — assign an issue to a user */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const assigneeId = String(body.assigneeId || '').trim();
  if (!assigneeId) {
    return NextResponse.json({ error: 'assignee_id_required' }, { status: 400 });
  }

  const issue = await IssueService.assign(id, assigneeId);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}
