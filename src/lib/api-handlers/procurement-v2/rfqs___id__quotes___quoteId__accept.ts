import { NextRequest, NextResponse } from 'next/server';
import { RFQService } from '@/lib/services/rfq-service';

/** POST /api/procurement-v2/rfqs/[id]/quotes/[quoteId]/accept — accept a quote */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; quoteId: string } },
) {
  const { id, quoteId } = params;
  try {
    const result = await RFQService.acceptQuote(id, quoteId);
    if (!result.rfq) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ rfq: result.rfq, purchaseOrder: result.po });
  } catch (e) {
    console.error('[procurement-v2/rfqs/quotes/accept] error:', e);
    return NextResponse.json({ error: 'failed_to_accept_quote' }, { status: 500 });
  }
}
