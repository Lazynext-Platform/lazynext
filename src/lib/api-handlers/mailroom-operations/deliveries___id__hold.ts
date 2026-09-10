import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const holdBy = String(body.holdBy || session.user.id);
  const delivery = await MailroomOperationsService.holdDelivery(id, holdBy);
  if (!delivery) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ delivery });
}
