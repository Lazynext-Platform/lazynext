import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const contribution = await PoliticalAdvocacyService.getContribution(id);
  if (!contribution) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ contribution });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const contribution = await PoliticalAdvocacyService.updateContribution(id, body);
    if (!contribution) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ contribution });
  } catch (e) {
    console.error('[political-advocacy/contributions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_contribution' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PoliticalAdvocacyService.deleteContribution(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
