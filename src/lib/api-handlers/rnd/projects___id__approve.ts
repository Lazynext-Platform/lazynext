import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RndService } from '@/lib/services/rnd-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const project = await RndService.approveProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ project });
}
