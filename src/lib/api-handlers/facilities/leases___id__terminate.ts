import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** POST /api/facilities/leases/[id]/terminate — terminate a lease */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();

  const lease = await FacilitiesService.terminateLease(id, reason);
  if (!lease) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ lease });
}
