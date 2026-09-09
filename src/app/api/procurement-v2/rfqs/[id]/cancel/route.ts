import { NextRequest, NextResponse } from 'next/server';
import { RFQService } from '@/lib/services/rfq-service';

/** POST /api/procurement-v2/rfqs/[id]/cancel — cancel an RFQ */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = await RFQService.cancel(id);
  if (!rfq) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ rfq });
}
