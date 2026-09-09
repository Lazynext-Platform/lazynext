import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IssueService } from '@/lib/services/issue-service';

/** POST /api/issues/[id]/status — change an issue's status */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  const issue = await IssueService.changeStatus(id, status as 'open' | 'in_progress' | 'in_review' | 'done' | 'closed');
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}
