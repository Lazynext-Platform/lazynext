import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IssueService } from '@/lib/services/issue-service';

/** POST /api/issues/[id]/labels — add a label to an issue */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const label = String(body.label || '').trim();
  if (!label) {
    return NextResponse.json({ error: 'label_required' }, { status: 400 });
  }

  const issue = await IssueService.addLabel(id, label);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}

/** DELETE /api/issues/[id]/labels?label=foo — remove a label from an issue */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const label = sp.get('label') || '';
  if (!label) {
    return NextResponse.json({ error: 'label_required' }, { status: 400 });
  }

  const issue = await IssueService.removeLabel(id, label);
  if (!issue) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}
