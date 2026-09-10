import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CrisisCommunicationService } from '@/lib/services/crisis-communication-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const plan = await CrisisCommunicationService.executeCrisisPlan(id, session.user.id);
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ plan });
}
