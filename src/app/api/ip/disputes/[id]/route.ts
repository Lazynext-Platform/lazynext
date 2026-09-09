import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/disputes/[id] — get a single IP dispute */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const dispute = await IPService.getDispute(id);
  if (!dispute) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ dispute });
}

/** PATCH /api/ip/disputes/[id] — update an IP dispute */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const dispute = await IPService.updateDispute(id, {
      title: body.title, type: body.type, status: body.status,
      opposingParty: body.opposingParty, filedDate: body.filedDate,
      jurisdiction: body.jurisdiction, description: body.description,
      claims: body.claims, evidence: body.evidence, legalCosts: body.legalCosts,
    });
    if (!dispute) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ dispute });
  } catch (e) {
    console.error('[ip/disputes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_dispute' }, { status: 500 });
  }
}
