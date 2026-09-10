import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const training = await FranchiseDevelopmentService.getTraining(id);
  if (!training) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ training });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const training = await FranchiseDevelopmentService.updateTraining(id, body);
    if (!training) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ training });
  } catch (e) {
    console.error('[franchise-development/training] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_training' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await FranchiseDevelopmentService.deleteTraining(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
