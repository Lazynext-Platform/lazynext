import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const postage = await MailroomOperationsService.getPostage(id);
  if (!postage) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ postage });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const postage = await MailroomOperationsService.updatePostage(id, body);
    if (!postage) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ postage });
  } catch (e) {
    console.error('[mailroom-operations/postage] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_postage' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await MailroomOperationsService.deletePostage(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
