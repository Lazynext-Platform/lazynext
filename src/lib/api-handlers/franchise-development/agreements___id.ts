import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const agreement = await FranchiseDevelopmentService.getAgreement(id);
  if (!agreement) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ agreement });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const agreement = await FranchiseDevelopmentService.updateAgreement(id, body);
    if (!agreement) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ agreement });
  } catch (e) {
    console.error('[franchise-development/agreements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_agreement' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await FranchiseDevelopmentService.deleteAgreement(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
