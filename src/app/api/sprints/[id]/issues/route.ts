import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints/[id]/issues — get all issues in a sprint */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const issues = await SprintService.getIssues(id);
  return NextResponse.json({ issues });
}

/** POST /api/sprints/[id]/issues — add an issue to a sprint */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const issueId = String(body.issueId || '').trim();
  if (!issueId) {
    return NextResponse.json({ error: 'issue_id_required' }, { status: 400 });
  }

  const issue = await SprintService.addIssue(id, issueId);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}

/** DELETE /api/sprints/[id]/issues?issueId=foo — remove an issue from a sprint */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const issueId = sp.get('issueId') || '';
  if (!issueId) {
    return NextResponse.json({ error: 'issue_id_required' }, { status: 400 });
  }

  const issue = await SprintService.removeIssue(id, issueId);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}
