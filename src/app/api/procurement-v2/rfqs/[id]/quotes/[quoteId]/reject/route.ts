import { NextRequest, NextResponse } from 'next/server';
import { RFQService } from '@/lib/services/rfq-service';

/** POST /api/procurement-v2/rfqs/[id]/quotes/[quoteId]/reject — reject a quote */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> },
) {
  const { id, quoteId } = await params;
  const body = await req.json().catch(() => ({}));
  const rfq = await RFQService.rejectQuote(id, quoteId, body.reason);
  if (!rfq) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ rfq });
}
