import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assembly = await ContextEngineService.draftAssembly(id, session.user.id);
  if (!assembly) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assembly });
}
