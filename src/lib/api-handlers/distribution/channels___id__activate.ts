import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DistributionService } from '@/lib/services/distribution-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const channel = await DistributionService.activateChannel(id, session.user.id);
  if (!channel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ channel });
}
