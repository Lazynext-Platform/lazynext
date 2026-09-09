import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const initiative = await DeiService.activateInitiative(id, session.user.id);
    if (!initiative) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ initiative });
  } catch (e) {
    console.error('[dei/initiatives/activate] error:', e);
    return NextResponse.json({ error: 'failed_to_activate_initiative' }, { status: 500 });
  }
}
