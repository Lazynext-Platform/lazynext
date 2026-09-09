import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const delayedBy = String(body.delayedBy || session.user.id);
  const route = await MailroomOperationsService.delayRoute(id, delayedBy);
  if (!route) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ route });
}
